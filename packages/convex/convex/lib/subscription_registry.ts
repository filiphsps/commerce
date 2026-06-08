/**
 * The per-tenant live-subscription cap. Once a single tenant (shop) holds this many concurrently OPEN
 * live subscriptions, the breaker trips and every ADDITIONAL subscription for that tenant degrades to a
 * one-shot snapshot ("snapshot + poll") instead of a live, reactively-maintained subscription. The cap is
 * a per-tenant cost/usage guardrail: a single misbehaving tenant cannot fan out an unbounded number of
 * reactive subscriptions and dominate the deployment's recompute budget at the expense of its neighbors.
 */
export const DEFAULT_TENANT_SUBSCRIPTION_THRESHOLD = 64;

/**
 * Upper bound on the default registry's retained metric buffer. The buffer is a fixed-capacity ring so a
 * long-lived isolate cannot grow it without bound; the oldest record is dropped once the cap is reached.
 */
const DEFAULT_METRIC_BUFFER_LIMIT = 1024;

/**
 * How a subscription was admitted by the registry: a `live` reactive subscription (under the cap) or a
 * degraded `snapshot` one-shot (the breaker is tripped for this tenant, so it returns once and the caller
 * is expected to poll).
 */
export type TenantSubscriptionMode = 'live' | 'snapshot';

/**
 * The per-tenant cost/usage signal emitted on every admission decision. A structured, deterministic record
 * (no wall-clock, no randomness) so observers — dashboards, tests — can assert on the exact breaker
 * behavior rather than scraping free-form logs.
 */
export interface TenantSubscriptionMetric {
    /** The tenant (shop) the decision was made for. */
    readonly shopId: string;
    /** The tenant's open live-subscription count AFTER this decision (degraded admissions do not change it). */
    readonly openSubscriptions: number;
    /** Whether this admission was granted a live subscription or degraded to a snapshot. */
    readonly mode: TenantSubscriptionMode;
    /** Whether the breaker was tripped for this tenant at decision time (`true` exactly when `mode` is `snapshot`). */
    readonly degraded: boolean;
}

/**
 * Sink the registry pushes each {@link TenantSubscriptionMetric} to. Injected so the emission target is a
 * deterministic, testable seam (a buffer in tests; a logging/metrics adapter in production).
 *
 * @param metric - The admission decision to record.
 */
export type TenantSubscriptionMetricSink = (metric: TenantSubscriptionMetric) => void;

/**
 * The receipt returned by {@link TenantSubscriptionRegistry.open}. For a `live` admission, calling
 * {@link release} decrements the tenant's open count (resetting the breaker once it drops back under the
 * threshold); for a degraded `snapshot` admission {@link release} is a no-op, since nothing was counted.
 */
export interface TenantSubscriptionHandle {
    /** How the subscription was admitted. */
    readonly mode: TenantSubscriptionMode;
    /**
     * Releases a live subscription's slot. Idempotent — calling more than once releases exactly one slot.
     * A no-op for a degraded `snapshot` admission.
     */
    release(): void;
}

/**
 * Construction options for {@link TenantSubscriptionRegistry}.
 */
export interface TenantSubscriptionRegistryOptions {
    /** The per-tenant open-subscription threshold above which new subscriptions degrade. Must be `>= 1`. */
    readonly threshold: number;
    /** Where admission decisions are emitted. */
    readonly onMetric: TenantSubscriptionMetricSink;
}

/**
 * A no-op release used by degraded (snapshot) admissions, which hold no counted slot to give back.
 */
const NOOP_RELEASE = (): void => {};

/**
 * An in-isolate, per-tenant subscription registry with a circuit breaker. It tracks the number of OPEN
 * live subscriptions per tenant (shop) and, once a tenant reaches its threshold, degrades every further
 * subscription to a one-shot snapshot until enough live subscriptions are released to drop the tenant back
 * under the threshold (the breaker reset). Every decision emits a per-tenant cost/usage metric.
 *
 * Fully deterministic: it reads no wall-clock and draws no randomness, so the same sequence of
 * `open`/`release` calls always yields the same modes and metrics — the property the banned-globals rule
 * in the Convex isolate requires and that makes the breaker assertable.
 */
export class TenantSubscriptionRegistry {
    readonly #threshold: number;
    readonly #onMetric: TenantSubscriptionMetricSink;
    /** Per-tenant open live-subscription counts. A tenant absent from the map holds zero. */
    readonly #counts = new Map<string, number>();

    /**
     * @param options - The threshold and metric sink. A `threshold < 1` is clamped to `1`, since a tenant
     *   must be allowed at least one live subscription before the breaker can trip.
     */
    constructor(options: TenantSubscriptionRegistryOptions) {
        this.#threshold = Math.max(1, Math.trunc(options.threshold));
        this.#onMetric = options.onMetric;
    }

    /**
     * The per-tenant open-subscription threshold this registry trips at.
     *
     * @returns The effective (clamped) threshold.
     */
    get threshold(): number {
        return this.#threshold;
    }

    /**
     * Reports a tenant's current open live-subscription count.
     *
     * @param shopId - The tenant (shop) to inspect.
     * @returns The number of currently open live subscriptions for the tenant (zero when none).
     */
    openSubscriptions(shopId: string): number {
        return this.#counts.get(shopId) ?? 0;
    }

    /**
     * Admits a subscription for a tenant. Under the tenant's threshold the subscription is admitted `live`
     * and the tenant's open count is incremented; at or above the threshold the breaker is tripped and the
     * subscription is degraded to a one-shot `snapshot` without changing the count. Emits one
     * {@link TenantSubscriptionMetric} per call.
     *
     * @param shopId - The tenant (shop) the subscription belongs to.
     * @returns A {@link TenantSubscriptionHandle} carrying the chosen mode and a slot-release callback.
     */
    open(shopId: string): TenantSubscriptionHandle {
        const current = this.#counts.get(shopId) ?? 0;
        if (current >= this.#threshold) {
            this.#emit(shopId, current, 'snapshot', true);
            return { mode: 'snapshot', release: NOOP_RELEASE };
        }

        const next = current + 1;
        this.#counts.set(shopId, next);
        this.#emit(shopId, next, 'live', false);

        let released = false;
        return {
            mode: 'live',
            release: () => {
                if (released) {
                    return;
                }
                released = true;
                this.#decrement(shopId);
            },
        };
    }

    /**
     * Clears all tracked open-subscription counts, resetting every tenant's breaker. Operational reset for
     * a drained isolate (and the per-case reset tests rely on).
     */
    reset(): void {
        this.#counts.clear();
    }

    /**
     * Decrements a tenant's open count by one, removing the entry entirely once it reaches zero so a
     * never-active tenant leaves no residue in the map.
     *
     * @param shopId - The tenant whose slot is being released.
     */
    #decrement(shopId: string): void {
        const current = this.#counts.get(shopId) ?? 0;
        const next = current - 1;
        if (next <= 0) {
            this.#counts.delete(shopId);
            return;
        }
        this.#counts.set(shopId, next);
    }

    /**
     * Emits a single admission decision to the configured sink.
     *
     * @param shopId - The tenant the decision was made for.
     * @param openSubscriptions - The tenant's open count after the decision.
     * @param mode - The admitted mode.
     * @param degraded - Whether the breaker was tripped.
     */
    #emit(shopId: string, openSubscriptions: number, mode: TenantSubscriptionMode, degraded: boolean): void {
        this.#onMetric({ shopId, openSubscriptions, mode, degraded });
    }
}

/**
 * The default registry's metric buffer — a fixed-capacity ring drained by
 * {@link drainTenantSubscriptionMetrics}. Module-scoped so the in-isolate registry and its observers share
 * one record of decisions.
 */
const defaultMetrics: TenantSubscriptionMetric[] = [];

/**
 * Appends a metric to {@link defaultMetrics}, dropping the oldest record once the buffer is at capacity so
 * a long-lived isolate cannot grow it without bound.
 *
 * @param metric - The admission decision to retain.
 */
const recordDefaultMetric: TenantSubscriptionMetricSink = (metric) => {
    defaultMetrics.push(metric);
    if (defaultMetrics.length > DEFAULT_METRIC_BUFFER_LIMIT) {
        defaultMetrics.shift();
    }
};

/**
 * The process-wide, in-isolate registry the tenant wrappers (`tenantQuery`/`tenantMutation`) admit through.
 * A single module-scoped instance so per-tenant subscription state and its cost/usage metrics persist
 * across function invocations that share the isolate.
 */
export const tenantSubscriptionRegistry = new TenantSubscriptionRegistry({
    threshold: DEFAULT_TENANT_SUBSCRIPTION_THRESHOLD,
    onMetric: recordDefaultMetric,
});

/**
 * Drains every metric recorded by {@link tenantSubscriptionRegistry} since the last drain, emptying the
 * buffer. The assertable read side of the default registry's cost/usage signal.
 *
 * @returns The buffered metrics in emission order; the buffer is left empty.
 */
export function drainTenantSubscriptionMetrics(): TenantSubscriptionMetric[] {
    return defaultMetrics.splice(0, defaultMetrics.length);
}

import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import schema from '../schema';
import {
    drainTenantSubscriptionMetrics,
    type TenantSubscriptionMetric,
    TenantSubscriptionRegistry,
    tenantSubscriptionRegistry,
} from './subscription_registry';
import { systemMutation } from './system';
import { tenantQuery } from './tenant';

/**
 * Builds a registry whose metrics land in a caller-owned array, so each case can assert the exact emission
 * sequence without touching the process-wide default sink.
 *
 * @param threshold - The per-tenant open-subscription threshold to construct the registry with.
 * @returns The registry plus the live metric buffer it appends to in emission order.
 */
function makeRegistry(threshold: number): {
    registry: TenantSubscriptionRegistry;
    metrics: TenantSubscriptionMetric[];
} {
    const metrics: TenantSubscriptionMetric[] = [];
    const registry = new TenantSubscriptionRegistry({ threshold, onMetric: (metric) => metrics.push(metric) });
    return { registry, metrics };
}

describe('TenantSubscriptionRegistry (per-tenant circuit breaker)', () => {
    it('degrades new subscriptions to snapshot once a tenant reaches its threshold', () => {
        const { registry } = makeRegistry(2);

        // Under threshold: admitted live and counted.
        expect(registry.open('shop_a').mode).toBe('live');
        expect(registry.open('shop_a').mode).toBe('live');
        expect(registry.openSubscriptions('shop_a')).toBe(2);

        // At threshold: the breaker trips and every further subscription degrades to a one-shot snapshot.
        expect(registry.open('shop_a').mode).toBe('snapshot');
        expect(registry.open('shop_a').mode).toBe('snapshot');
        // Degraded admissions hold no slot, so the open count is unchanged.
        expect(registry.openSubscriptions('shop_a')).toBe(2);
    });

    it('isolates breaker state per tenant', () => {
        const { registry } = makeRegistry(1);

        expect(registry.open('shop_a').mode).toBe('live');
        // shop_a is saturated, but shop_b's budget is untouched.
        expect(registry.open('shop_a').mode).toBe('snapshot');
        expect(registry.open('shop_b').mode).toBe('live');
    });

    it('emits an assertable per-tenant metric for every admission decision', () => {
        const { registry, metrics } = makeRegistry(1);

        registry.open('shop_a');
        registry.open('shop_a');

        expect(metrics).toEqual<TenantSubscriptionMetric[]>([
            { shopId: 'shop_a', openSubscriptions: 1, mode: 'live', degraded: false },
            { shopId: 'shop_a', openSubscriptions: 1, mode: 'snapshot', degraded: true },
        ]);
    });

    it('resets the breaker when releases drop the count back under the threshold', () => {
        const { registry } = makeRegistry(2);

        const first = registry.open('shop_a');
        registry.open('shop_a');
        expect(registry.open('shop_a').mode).toBe('snapshot');

        // Releasing one live slot drops the count under the threshold, so the breaker resets.
        first.release();
        expect(registry.openSubscriptions('shop_a')).toBe(1);
        expect(registry.open('shop_a').mode).toBe('live');
    });

    it('treats release as idempotent so a double release frees only one slot', () => {
        const { registry } = makeRegistry(2);

        registry.open('shop_a');
        const second = registry.open('shop_a');
        second.release();
        second.release();

        expect(registry.openSubscriptions('shop_a')).toBe(1);
    });

    it('reset() clears every tenant breaker at once', () => {
        const { registry } = makeRegistry(1);

        registry.open('shop_a');
        registry.open('shop_b');
        registry.reset();

        expect(registry.openSubscriptions('shop_a')).toBe(0);
        expect(registry.open('shop_a').mode).toBe('live');
    });

    it('clamps a sub-one threshold so a tenant always gets at least one live subscription', () => {
        const { registry } = makeRegistry(0);

        expect(registry.threshold).toBe(1);
        expect(registry.open('shop_a').mode).toBe('live');
        expect(registry.open('shop_a').mode).toBe('snapshot');
    });
});

/**
 * A fixed epoch-ms stamp for seeded rows' managed timestamps; its exact value is irrelevant to these
 * assertions, it only has to satisfy the numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/** The trusted issuer the tenant constructors assert against under `convex-test`. */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * Seeds a single isolated tenant (user + shop + collaborator) through the system tier's raw db, so the
 * wiring test has a resolvable admin identity.
 *
 * @returns The seeded `shops` id.
 */
const seedTenant = systemMutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) => {
        const userId = await ctx.db.insert('users', {
            email,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_a',
            name: 'shop_a',
            domain: 'a.example.com',
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'shop_a' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
        return shopId;
    },
});

/**
 * A {@link tenantQuery} fixture surfacing the admission mode the wrapper chose, so the wiring test can prove
 * the registry is actually consulted inside `tenantQuery`'s custom context.
 */
const subscriptionModeProbe = tenantQuery({
    args: {},
    handler: async (ctx) => ({ shopId: ctx.shopId, subscriptionMode: ctx.subscriptionMode }),
});

const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/lib/subscription_registry.test.ts': () => Promise.resolve({ seedTenant, subscriptionModeProbe }),
};

const seedTenantRef = makeFunctionReference<'mutation'>('lib/subscription_registry.test:seedTenant');
const probeRef = makeFunctionReference<'query'>('lib/subscription_registry.test:subscriptionModeProbe');

describe('tenantQuery wiring (default registry admits each invocation)', () => {
    beforeEach(() => {
        vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
        tenantSubscriptionRegistry.reset();
        drainTenantSubscriptionMetrics();
    });
    afterEach(() => {
        vi.unstubAllEnvs();
        tenantSubscriptionRegistry.reset();
        drainTenantSubscriptionMetrics();
    });

    it('degrades a saturated tenant to snapshot mode and emits the per-tenant metric, then resets', async () => {
        const t = convexTest(schema, modules);
        const shopId = await t.mutation(seedTenantRef, { email: 'op-a@example.com' });
        const asOperator = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op-a@example.com' });

        // A fresh tenant is under budget, so the wrapper admits a live subscription.
        const live = await asOperator.query(probeRef, {});
        expect(live.shopId).toBe(shopId);
        expect(live.subscriptionMode).toBe('live');

        // Saturate the shared default registry up to its threshold; the next admission must degrade.
        for (let i = 0; i < tenantSubscriptionRegistry.threshold; i += 1) {
            tenantSubscriptionRegistry.open(shopId);
        }
        drainTenantSubscriptionMetrics();

        const degraded = await asOperator.query(probeRef, {});
        expect(degraded.subscriptionMode).toBe('snapshot');

        const metrics = drainTenantSubscriptionMetrics();
        expect(metrics).toContainEqual<TenantSubscriptionMetric>({
            shopId,
            openSubscriptions: tenantSubscriptionRegistry.threshold,
            mode: 'snapshot',
            degraded: true,
        });

        // Resetting the breaker readmits live subscriptions for the tenant.
        tenantSubscriptionRegistry.reset();
        const recovered = await asOperator.query(probeRef, {});
        expect(recovered.subscriptionMode).toBe('live');
    });
});

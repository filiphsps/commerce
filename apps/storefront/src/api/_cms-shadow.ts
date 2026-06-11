import 'server-only';

import { type LexicalDocument, lexicalToProseMirror } from '@nordcom/commerce-cms/editor/richtext';
import { convexServerMutation, convexServerQuery } from '@nordcom/commerce-db';
import { after } from 'next/server';

/**
 * SFREAD-12 — the CMS dual-read shadow. Every storefront CMS getter routes through
 * {@link runCmsDualRead}. For the getters still baking, Payload-on-Mongo is the authoritative
 * backend while an OPT-IN shadow (`CMS_READ_SHADOW`) also reads the Convex `cms/read` functions,
 * normalizes both results (Mongo's Lexical rich text is converted through the real CMSRICH-04
 * codec, volatile ids/timestamps are stripped), and records every divergence in the
 * `cmsReadDivergence` Convex ledger. The per-getter flip (`CMS_READ_FLIP`) serves the Convex
 * result instead — the cutover lever — and since CUTOVER-04 the gate cohort
 * ({@link DEFAULT_FLIPPED_GETTERS}) is flipped BY DEFAULT, with the env lever working in the
 * opposite direction (`-getter` negation) as the emergency-shadow escape hatch.
 *
 * Safety posture, in order:
 * - For an un-flipped getter with both flags unset NOTHING observable changes: the Mongo result is
 *   returned untouched and the Convex transport is never invoked. A default-flipped getter serves
 *   Convex instead; its shadow comparison is RETIRED (see {@link DEFAULT_FLIPPED_GETTERS}).
 * - The shadow runs strictly AFTER the Mongo result resolves and is never awaited on the request
 *   path — a Convex error/timeout can only ever produce a ledger row, never break the page. Inside
 *   a Next render the shadow is deferred through `after()` (SFREAD-11), so its execution happens
 *   OUTSIDE the `'use cache'` boundary the getters run in: nothing about the comparison or the
 *   ledger write participates in cache-entry creation, and `after()`'s waitUntil semantics keep a
 *   serverless runtime from freezing the ledger write mid-flight. The leg touches no request-scoped
 *   API (`cookies()`, `cacheTag`, …) and reads no clock in-process (the ledger stamps times
 *   Convex-side), so it is prerender-safe; outside a Next scope (unit tests, scripts) it degrades
 *   to a tracked detached promise that tests drain via {@link flushCmsShadows}.
 * - A flipped getter that fails on the Convex side falls back to Mongo and records the failure, so
 *   even a misconfigured flip degrades to the pre-flip behavior instead of a 500.
 */

/**
 * The getter surfaces the dual-read loader wraps — the storefront faces of the 11-getter SFREAD-01
 * contract (the two pure resolvers, `resolveLink`/`resolveTenantId`, have no backend to shadow).
 */
export type CmsReadGetterName =
    | 'header'
    | 'footer'
    | 'businessData'
    | 'page'
    | 'pages'
    | 'article'
    | 'articles'
    | 'productMetadata'
    | 'collectionMetadata';

/**
 * The transport the shadow drives: the `packages/db` server-trust seam by default, injectable so
 * tests exercise the full dual-read flow without a deployment.
 */
export type CmsShadowTransport = {
    /** Calls a Convex `serverQuery` by path (`cms/read:…`). */
    query: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    /** Calls a Convex `serverMutation` by path (the ledger write). */
    mutation: (name: string, args: Record<string, unknown>) => Promise<unknown>;
};

const defaultTransport: CmsShadowTransport = {
    query: (name, args) => convexServerQuery(name, args),
    mutation: (name, args) => convexServerMutation(name, args),
};

let transport: CmsShadowTransport = defaultTransport;

/**
 * Test hook: substitute (or with `null` restore) the Convex transport the shadow drives.
 *
 * @param override - The replacement transport, or `null` to restore the server-trust seam.
 */
export function __setCmsShadowTransport(override: CmsShadowTransport | null): void {
    transport = override ?? defaultTransport;
}

/** In-flight shadow comparisons; tracked only so tests can deterministically drain them. */
const pendingShadows = new Set<Promise<void>>();

/**
 * Registers a detached shadow promise for {@link flushCmsShadows} and removes it once settled.
 * The promise is never awaited on the request path.
 *
 * @param promise - The fire-and-forget shadow/ledger promise.
 */
function track(promise: Promise<void>): void {
    pendingShadows.add(promise);
    promise.finally(() => {
        pendingShadows.delete(promise);
    });
}

/**
 * Schedules the fire-and-forget shadow/ledger leg OUTSIDE the active render and cache scope.
 *
 * The getters run inside `'use cache'` boundaries (the chrome under `CachedShell`, the cached page
 * bodies), so spawning the leg inline would execute its network I/O during cache-entry creation.
 * `after()` defers it until the response (or prerender) has finished — the work store survives into
 * `use cache` scopes, so this is callable from inside them, and the callback only ever runs when
 * the cached body actually executed (a cache fill), which is exactly when a fresh Mongo result
 * exists to compare. Outside a Next request/prerender scope `after()` throws synchronously
 * (`E468`); the fallback runs the leg as a tracked detached promise so unit tests and scripts keep
 * the pre-SFREAD-11 behavior and can drain via {@link flushCmsShadows}.
 *
 * @param run - Thunk starting the shadow comparison or ledger write; must never throw.
 */
function scheduleShadow(run: () => Promise<void>): void {
    try {
        after(run);
    } catch {
        track(run());
    }
}

/**
 * Awaits every in-flight shadow comparison — the test-only synchronization point for the
 * fire-and-forget production path.
 *
 * @returns Resolves once all currently pending shadows settled.
 */
export async function flushCmsShadows(): Promise<void> {
    while (pendingShadows.size > 0) {
        await Promise.allSettled([...pendingShadows]);
    }
}

/**
 * Whether the non-blocking Convex shadow read is enabled. Opt-in (default OFF) so an environment
 * without a Convex deployment never produces error-ledger noise; mirrors the
 * `STOREFRONT_ACCOUNT_LIVE_ISLAND` env-lever pattern.
 *
 * @param env - Environment to read (injectable for tests); defaults to `process.env`.
 * @returns `true` when `CMS_READ_SHADOW` is set to an enable value (`1`/`true`/`on`/`enabled`, case-insensitive).
 */
export function isCmsShadowEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const flag = env.CMS_READ_SHADOW?.trim().toLowerCase();
    return flag === '1' || flag === 'true' || flag === 'on' || flag === 'enabled';
}

/**
 * Getters served Convex-native BY DEFAULT — the CUTOVER-04 gate cohort: the `header` singleton and
 * the pages surface (`page` by slug plus the `pages` listing that feeds slugs/sitemaps). For these,
 * Convex IS the repo-default authority: the native editor is the only authoring path and the
 * cohort's Payload write surface is retired, so the Mongo copies are an inert cutover-time snapshot.
 *
 * Shadow design for the flipped cohort (the choice CUTOVER-05/06 inherit): the divergence
 * comparison RETIRES rather than inverts. An inverted (Mongo-as-shadow) comparison would flag a
 * mismatch on the first native edit — the snapshot can only fall behind — and that steady noise
 * would drown the ledger's real signal for the cohorts still baking Mongo-authoritative. The
 * ledger stays useful: un-flipped getters keep the full comparison, and flipped getters still
 * record `kind: 'error'` rows when a Convex serve fails and falls back to the Mongo snapshot.
 */
export const DEFAULT_FLIPPED_GETTERS: ReadonlySet<CmsReadGetterName> = new Set(['header', 'page', 'pages']);

/**
 * Parses the `CMS_READ_FLIP` per-getter flip map: a comma/space-separated list of getter names
 * (`CMS_READ_FLIP=article,articles`), `*`/`all` to flip every getter, and `-`-prefixed negations
 * (`-header`, `-*`) to force a getter BACK to Mongo. Negation entries pass through verbatim;
 * {@link isCmsGetterFlipped} owns the precedence.
 *
 * @param value - The raw env value.
 * @returns The set of flip entries (lowercased as authored, negations included).
 */
export function parseCmsReadFlip(value: string | undefined): Set<string> {
    if (!value) return new Set();
    return new Set(
        value
            .split(/[\s,]+/)
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0),
    );
}

/**
 * Whether a getter serves the Convex result. Precedence, most-specific first: a `-getter` negation
 * wins, then an explicit getter name, then the `-*`/`-all` wildcard negation, then the `*`/`all`
 * wildcard, and finally the {@link DEFAULT_FLIPPED_GETTERS} cohort default.
 *
 * Since CUTOVER-04 the env lever therefore works in BOTH directions: naming a getter flips it
 * early (the pre-cutover direction), while negating a default-flipped getter
 * (`CMS_READ_FLIP=-header,-page,-pages`) is the emergency-shadow lever — it returns the getter to
 * the pre-flip posture (Mongo-snapshot authoritative, opt-in `CMS_READ_SHADOW` comparison) without
 * a deploy. The snapshot is frozen at cutover, so emergency-shadow is a degraded mode for riding
 * out a Convex incident, never a place to author from.
 *
 * @param getter - The getter surface name.
 * @param env - Environment to read (injectable for tests); defaults to `process.env`.
 * @returns `true` when the getter resolves to the Convex side under the precedence above.
 */
export function isCmsGetterFlipped(getter: CmsReadGetterName, env: NodeJS.ProcessEnv = process.env): boolean {
    const entries = parseCmsReadFlip(env.CMS_READ_FLIP);
    if (entries.has(`-${getter}`)) return false;
    if (entries.has(getter)) return true;
    if (entries.has('-*') || entries.has('-all')) return false;
    if (entries.has('*') || entries.has('all')) return true;
    return DEFAULT_FLIPPED_GETTERS.has(getter);
}

/**
 * Bookkeeping keys stripped before comparison: backend-assigned identity, lifecycle status, managed
 * timestamps, and tenancy keys all legitimately differ across backends (Convex ids vs Mongo
 * ObjectIds, epoch precision, populated `tenant` relations) without the CONTENT diverging.
 */
const VOLATILE_KEYS = new Set([
    'id',
    '_id',
    '_creationTime',
    '_status',
    'status',
    'createdAt',
    'updatedAt',
    'tenant',
    'shop',
]);

/**
 * Guards against arrays, `null`, and class instances, accepting only plain JS objects.
 *
 * @param value - Value to discriminate.
 * @returns `true` only when `value` is a non-null, non-array object.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Detects a stored Lexical rich-text document (`{ root: { children: [...] } }`) — the shape the
 * Payload-on-Mongo side serves for `richText` fields.
 *
 * @param value - Candidate field value.
 * @returns `true` when the value is a Lexical document to run through the codec.
 */
const isLexicalDocument = (value: unknown): value is LexicalDocument =>
    isPlainObject(value) && isPlainObject(value.root) && Array.isArray(value.root.children);

/**
 * Canonicalizes a CMS read result for cross-backend comparison: Lexical rich text converts to
 * ProseMirror via the lossless CMSRICH-04 codec (so a Mongo Lexical body and its ETL'd ProseMirror
 * twin compare equal), volatile bookkeeping keys are stripped at every depth, and `null`/absent
 * collapse together (Payload emits explicit `null` for unset fields where Convex omits the key).
 * An off-corpus Lexical document the codec rejects is kept verbatim — the resulting mismatch is
 * exactly what the ledger exists to surface.
 *
 * @param value - The raw getter result (or a fragment of it).
 * @returns The normalized structure suitable for {@link findCmsDivergence}.
 */
export function normalizeCmsValue(value: unknown): unknown {
    if (isLexicalDocument(value)) {
        try {
            return normalizeCmsValue(lexicalToProseMirror(value));
        } catch {
            // Unconvertible content stays as-is; the comparison will flag it for the bake report.
        }
    }
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeCmsValue(entry));
    }
    if (isPlainObject(value)) {
        const out: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value)) {
            if (VOLATILE_KEYS.has(key)) continue;
            const normalized = normalizeCmsValue(entry);
            if (normalized === null || normalized === undefined) continue;
            out[key] = normalized;
        }
        return out;
    }
    return value;
}

/**
 * Renders a short, bounded scalar preview for divergence details.
 *
 * @param value - The value to preview.
 * @returns A JSON-ish preview capped at 80 characters.
 */
function preview(value: unknown): string {
    try {
        return JSON.stringify(value)?.slice(0, 80) ?? 'undefined';
    } catch {
        return String(value).slice(0, 80);
    }
}

/**
 * Structurally diffs two NORMALIZED values, returning the first differing path — the divergence
 * summary persisted to the ledger.
 *
 * @param a - The normalized Mongo-side value.
 * @param b - The normalized Convex-side value.
 * @param path - Current traversal path (root callers omit it).
 * @returns A `path: a != b` summary, or `null` when the values are structurally identical.
 */
export function findCmsDivergence(a: unknown, b: unknown, path = '$'): string | null {
    if (Object.is(a, b)) return null;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return `${path}.length: ${a.length} != ${b.length}`;
        for (let index = 0; index < a.length; index++) {
            const nested = findCmsDivergence(a[index], b[index], `${path}[${index}]`);
            if (nested) return nested;
        }
        return null;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
            const nested = findCmsDivergence(a[key], b[key], `${path}.${key}`);
            if (nested) return nested;
        }
        return null;
    }
    return `${path}: ${preview(a)} != ${preview(b)}`;
}

/**
 * One dual-read invocation: the getter surface, its tenant/locale scope, the authoritative Mongo
 * read, and the Convex shadow read.
 */
export type CmsDualReadOptions<T> = {
    /** The getter surface name — the flip key and the ledger's `getter` column. */
    getter: CmsReadGetterName;
    /** PUBLIC shop id (the `OnlineShop.id` string the Convex read functions resolve). */
    shopId: string;
    /** BCP-47 request locale code. */
    locale: string;
    /** Natural key for keyed getters (slug/handle); recorded on divergence rows. */
    key?: string;
    /**
     * Draft-mode (preview) read. Skips the shadow comparison entirely: the
     * divergence ledger is a bake signal over PUBLISHED content, and a draft
     * mid-edit legitimately differs between backends on every keystroke —
     * comparing it would only pollute the ledger. The flip path still serves
     * Convex; the getter's `convex` closure carries the draft flag itself.
     */
    draft?: boolean;
    /** The authoritative Payload-on-Mongo read. */
    mongo: () => Promise<T>;
    /** The Convex shadow read, driven through the injected server-trust query transport. */
    convex: (query: CmsShadowTransport['query']) => Promise<unknown>;
    /**
     * Projects the Mongo result to the slice the shadow compares (e.g. a paginated envelope's
     * `docs`); defaults to the identity.
     */
    project?: (result: T) => unknown;
    /** Maps the raw Convex result to the getter's contract shape when the getter is flipped. */
    fromConvex?: (value: unknown) => T;
    /** Environment override for tests; defaults to `process.env`. */
    env?: NodeJS.ProcessEnv;
};

/**
 * Fire-and-forget ledger append. Failures are swallowed by design: the ledger is observability for
 * the bake, never a dependency of the page render.
 *
 * @param record - The divergence row payload (`cms/read:recordDivergence` args).
 * @returns Resolves regardless of transport success.
 */
async function recordDivergence(record: Record<string, unknown>): Promise<void> {
    try {
        await transport.mutation('cms/read:recordDivergence', record);
    } catch {
        // The ledger write is best-effort; a failed append must never surface.
    }
}

/**
 * Runs the shadow leg: read Convex, normalize both sides, and append a ledger row for an error or
 * a normalized mismatch. Never throws.
 *
 * @param opts - The dual-read invocation.
 * @param mongoResult - The already-resolved authoritative result.
 * @returns Resolves once the comparison (and any ledger write) settled.
 */
async function runShadowComparison<T>(opts: CmsDualReadOptions<T>, mongoResult: T): Promise<void> {
    const base = { shop: opts.shopId, getter: opts.getter, locale: opts.locale, key: opts.key };
    let convexValue: unknown;
    try {
        convexValue = await opts.convex(transport.query);
    } catch (error: unknown) {
        await recordDivergence({
            ...base,
            kind: 'error',
            detail: error instanceof Error ? error.message : String(error),
        });
        return;
    }
    try {
        const projected = (opts.project ?? ((result: T) => result as unknown))(mongoResult);
        const detail = findCmsDivergence(normalizeCmsValue(projected), normalizeCmsValue(convexValue));
        if (detail) {
            await recordDivergence({ ...base, kind: 'mismatch', detail });
        }
    } catch (error: unknown) {
        await recordDivergence({
            ...base,
            kind: 'error',
            detail: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * The dual-read loader. Serves Convex when the getter is flipped ({@link isCmsGetterFlipped} —
 * by `CMS_READ_FLIP` or the {@link DEFAULT_FLIPPED_GETTERS} cohort default), falling back to the
 * Mongo snapshot (and recording the failure) if the flipped read throws; the flipped path never
 * schedules a comparison (the retired-shadow design). Otherwise serves Mongo (authoritative for
 * the un-flipped cohorts) and schedules the non-blocking Convex shadow when `CMS_READ_SHADOW` is
 * enabled. A draft-mode invocation (`opts.draft`) never schedules the shadow — see the option's
 * contract.
 *
 * @param opts - The dual-read invocation.
 * @returns The getter's contract-shaped result.
 */
export async function runCmsDualRead<T>(opts: CmsDualReadOptions<T>): Promise<T> {
    const env = opts.env ?? process.env;

    if (isCmsGetterFlipped(opts.getter, env)) {
        try {
            const raw = await opts.convex(transport.query);
            return (opts.fromConvex ?? ((value: unknown) => value as T))(raw);
        } catch (error: unknown) {
            scheduleShadow(() =>
                recordDivergence({
                    shop: opts.shopId,
                    getter: opts.getter,
                    locale: opts.locale,
                    key: opts.key,
                    kind: 'error',
                    detail: `flip-serve failed, fell back to mongo: ${error instanceof Error ? error.message : String(error)}`,
                }),
            );
            return opts.mongo();
        }
    }

    const result = await opts.mongo();

    if (isCmsShadowEnabled(env) && opts.draft !== true) {
        // Detached on purpose: the comparison must never extend the request path. Scheduled via
        // `after()` so it runs outside the caller's `'use cache'` boundary (tracked-promise fallback
        // outside Next); its own error paths all terminate in swallowed ledger writes.
        scheduleShadow(() => runShadowComparison(opts, result));
    }

    return result;
}

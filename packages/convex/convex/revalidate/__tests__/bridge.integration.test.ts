import { register as registerActionRetrier } from '@convex-dev/action-retrier/test';
import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Id } from '../../_generated/dataModel';
import schema from '../../schema';
import { DELIVERY_RETRY_OPTIONS } from '../delivery';
import { REVALIDATE_DEBOUNCE_MS } from '../onPublish';
import { RECONCILE_THROTTLE } from '../reconcile';
import { deriveRevalidateTags } from '../tags';

/**
 * The trusted NextAuth issuer the tenant constructors assert against (via `resolveAdminShopId`),
 * stubbed into `CONVEX_AUTH_ISSUER` so the issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * Fixed wall clock for every case, so a scheduled function's `scheduledTime` and the delivered
 * payload's `ts` are exact, assertable functions of {@link REVALIDATE_DEBOUNCE_MS} rather than
 * wobbling real-time deltas.
 */
const NOW = 1_700_000_000_000;

/** The active signing secret stubbed into `CONVEX_REVALIDATE_SECRET` for every delivery. */
const SECRET = 'convex-current-secret';

/** A hypothetical post-rotation secret, used to pin the verifier's `{current, previous}` dual-accept. */
const ROTATED_SECRET = 'convex-rotated-secret';

/** Header carrying the base64 HMAC-SHA256 of the raw body — the exact name the Next verifier reads. */
const HMAC_HEADER = 'x-convex-hmac-sha256';

/** The structured marker `emitDeadLetterAlert` logs, distinguishing it from retrier noise. */
const ALERT_MARKER = 'revalidation delivery dead-lettered';

/**
 * Module map for `convex-test`, covering the WHOLE publish→delivery chain: the real `cms/documents`
 * save mutation (the chain's entry point), the `revalidate/onPublish` post-commit hook it schedules,
 * the `revalidate/notify` delivery action, the `revalidate/delivery` durable retrier path, and the
 * `revalidate/reconcile` self-heal cron. The dummy `_generated` key only anchors convex-test's shared
 * `/convex/` module-root detection (see `revalidate/idempotency.test.ts` for the rationale).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/documents.ts': () => import('../../cms/documents'),
    '/convex/revalidate/onPublish.ts': () => import('../onPublish'),
    '/convex/revalidate/notify.ts': () => import('../notify'),
    '/convex/revalidate/delivery.ts': () => import('../delivery'),
    '/convex/revalidate/reconcile.ts': () => import('../reconcile'),
};

const saveRef = makeFunctionReference<'mutation'>('cms/documents:save');
const enqueueRef = makeFunctionReference<'mutation'>('revalidate/delivery:enqueueDelivery');
const reconcileRef = makeFunctionReference<'action'>('revalidate/reconcile:reconcile');
const listLostRef = makeFunctionReference<'query'>('revalidate/reconcile:listLostWindows');

/**
 * Computes the base64 HMAC-SHA256 of a body, byte-identically to the Next verifier's
 * `createHmac('sha256', secret).update(body, 'utf8').digest('base64')`. Computed straight from the
 * Web Crypto primitive in the test (not via the production signer), so an equality against the sent
 * header proves the signed body round-trips against the verifier's algorithm and secret.
 *
 * @param body - The exact request body that was signed.
 * @param secret - The signing secret.
 * @returns The expected base64 signature.
 */
async function hmacBase64(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
    ]);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    let binary = '';
    for (const byte of new Uint8Array(signature)) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

/**
 * Test-side mirror of the storefront's `verifyRevalidateHmac` (BRIDGE-01,
 * `apps/storefront/src/api/_revalidate-convex.ts`): a signature is accepted when it matches the HMAC
 * computed with the CURRENT or the PREVIOUS secret — the dual-accept envelope that makes zero-downtime
 * rotation possible — and a missing signature rejects immediately. Re-declared here because the Convex
 * package cannot import the Next app; the algorithm, canonical-body contract, and acceptance envelope
 * are what this pins (the production verifier additionally compares in constant time, a hardening
 * concern irrelevant to the contract a test asserts).
 *
 * @param rawBody - The raw request body string, exactly the bytes that were signed.
 * @param signature - The base64 signature header value; `null` rejects immediately.
 * @param secrets - The current and optional previous signing secrets.
 * @returns `true` when the signature matches the HMAC computed with either secret; `false` otherwise.
 */
async function verifyBridgeHmac(
    rawBody: string,
    signature: string | null,
    secrets: { current: string; previous?: string },
): Promise<boolean> {
    if (!signature) return false;
    for (const secret of [secrets.current, secrets.previous]) {
        if (!secret) continue;
        if ((await hmacBase64(rawBody, secret)) === signature) return true;
    }
    return false;
}

/**
 * Seeds a shop addressable by the bridge's tenant→storefront resolution, keyed by its legacy id.
 *
 * @param t - The convex-test harness.
 * @param legacyId - The legacy shop id pending windows' `tenantId` resolves against.
 * @param domain - The shop's custom storefront host deliveries POST to.
 * @returns The seeded `shops` row id.
 */
async function seedShop(t: ReturnType<typeof convexTest>, legacyId: string, domain: string): Promise<Id<'shops'>> {
    return t.run((ctx) =>
        ctx.db.insert('shops', {
            legacyId,
            name: legacyId,
            domain,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        }),
    );
}

/**
 * Seeds an isolated tenant — one operator user, one shop, and a collaborator linking them — so the
 * REAL `cms/documents:save` tenant mutation resolves its shop from the identity's email exactly as
 * production does (`resolveAdminShopId`: identity → `users.by_email` → `shopCollaborators`).
 *
 * @param t - The convex-test harness.
 * @param email - The operator's identity email, the claim the tenant is resolved from.
 * @param legacyId - The shop's legacy id; its storefront host is `<legacyId>.example.com`.
 * @returns The seeded `shops` row id.
 */
async function seedTenant(t: ReturnType<typeof convexTest>, email: string, legacyId: string): Promise<Id<'shops'>> {
    const shopId = await seedShop(t, legacyId, `${legacyId}.example.com`);
    await t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
            email,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
    });
    return shopId;
}

/**
 * Seeds an un-acked pending coalescing window for a tenant, stamped at the current fake-clock time so
 * its `_creationTime` reconciliation cursor is controllable by advancing timers around the call.
 *
 * @param t - The convex-test harness.
 * @param tenantId - The string tenant id the window belongs to.
 * @param tags - The coalesced cache tags the window carries.
 * @returns The seeded `pendingRevalidations` row id.
 */
async function seedWindow(
    t: ReturnType<typeof convexTest>,
    tenantId: string,
    tags: string[],
): Promise<Id<'pendingRevalidations'>> {
    return t.run((ctx) => ctx.db.insert('pendingRevalidations', { tenantId, collection: 'pages', tags }));
}

/**
 * Reads the full `_scheduled_functions` ledger, the harness-visible record of every scheduler hop in
 * the chain (the post-commit `onPublish` hop, the debounced `notify`, the retrier's attempts).
 *
 * @param t - The convex-test harness.
 * @returns Every scheduled-function row, pending and settled.
 */
function scheduledJobs(t: ReturnType<typeof convexTest>) {
    return t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
}

/**
 * Advances the chain by exactly one scheduler hop: fires every timer ALREADY pending at the current
 * fake-clock time (the jobs armed by the previous hop) and awaits their Convex executions, without
 * running anything those executions schedule next — which is what lets a test assert the intermediate
 * `_scheduled_functions` notify row between `onPublish` and its debounced delivery.
 *
 * @param t - The convex-test harness.
 * @returns Resolves once every in-progress scheduled function has settled.
 */
async function step(t: ReturnType<typeof convexTest>): Promise<void> {
    vi.runOnlyPendingTimers();
    await t.finishInProgressScheduledFunctions();
}

/**
 * Counts the dead-letter alert lines captured by a `console.error` spy, ignoring the action-retrier
 * component's own per-failure error logs by matching only the bridge's structured alert marker.
 *
 * @param spy - The `console.error` spy.
 * @returns The number of dead-letter alerts emitted.
 */
function countAlerts(spy: ReturnType<typeof vi.spyOn>): number {
    return spy.mock.calls.filter((call: unknown[]) => typeof call[0] === 'string' && call[0].includes(ALERT_MARKER))
        .length;
}

beforeEach(() => {
    // Fake timers pin the clock and park every scheduler hop until the test fires it, making each
    // stage of the publish→delivery chain individually assertable.
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
    vi.stubEnv('CONVEX_REVALIDATE_SECRET', SECRET);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('GATE G3 — publish → debounce → notify → signed delivery (exit criterion 1)', () => {
    it('delivers a real CMS publish end to end and emits exactly the signed payload the storefront route verifies', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@gate.example.com', 'legacy-gate');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|op', email: 'op@gate.example.com' });

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        // The REAL tenant save mutation, publishing — the chain's production entry point.
        await asOp.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'About us', slug: 'about' },
            status: 'published',
        });

        // The publish armed the post-commit onPublish hop (delay 0) — never an inline delivery.
        const publishHops = (await scheduledJobs(t)).filter((job) => job.name === 'revalidate/onPublish:onPublish');
        expect(publishHops).toHaveLength(1);
        expect(publishHops[0]?.scheduledTime).toBe(NOW);

        await step(t);

        // onPublish coalesced one window carrying EXACTLY the shared-descriptor fanout...
        const expectedTags = deriveRevalidateTags({ collection: 'pages', key: 'about', tenantId: 'legacy-gate' });
        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(1);
        expect(pending[0]?.tenantId).toBe('legacy-gate');
        expect(pending[0]?.tags).toEqual(expectedTags);

        // ...and armed the single debounced notify, its handle stamped back onto the window.
        const notifyJobs = (await scheduledJobs(t)).filter(
            (job) => job.name === 'revalidate/notify:notify' && job.state.kind === 'pending',
        );
        expect(notifyJobs).toHaveLength(1);
        expect(notifyJobs[0]?.scheduledTime).toBe(NOW + REVALIDATE_DEBOUNCE_MS);
        expect(notifyJobs[0]?.args[0]?.pendingId).toBe(pending[0]?._id);
        expect(pending[0]?.scheduledJobId).toBe(notifyJobs[0]?._id);

        vi.advanceTimersByTime(REVALIDATE_DEBOUNCE_MS);
        await t.finishInProgressScheduledFunctions();

        // One POST to the tenant's storefront route — the HTTP boundary the Next side consumes.
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] ?? [];
        expect(url).toBe('https://legacy-gate.example.com/api/revalidate/convex');
        expect(init?.method).toBe('POST');

        const sentBody = init?.body as string;
        const headers = init?.headers as Record<string, string>;
        const parsed = JSON.parse(sentBody) as {
            collection: string;
            eventId: string;
            legacyShopId: string;
            tags: string[];
            tenantId: string;
            ts: number;
        };

        // The canonical fixed-key-order body the verifier re-derives, byte for byte.
        expect(Object.keys(parsed)).toEqual(['collection', 'eventId', 'legacyShopId', 'tags', 'tenantId', 'ts']);
        expect(sentBody).toBe(
            JSON.stringify({
                collection: 'pages',
                eventId: parsed.eventId,
                legacyShopId: 'legacy-gate',
                tags: expectedTags,
                tenantId: 'legacy-gate',
                ts: NOW + REVALIDATE_DEBOUNCE_MS,
            }),
        );

        // The tag payload the storefront would invalidate — exactly deriveRevalidateTags's fanout.
        expect(parsed.tags).toEqual(expectedTags);
        expect(parsed.tenantId).toBe('legacy-gate');
        expect(parsed.legacyShopId).toBe('legacy-gate');
        expect(parsed.collection).toBe('pages');
        expect(parsed.ts).toBe(NOW + REVALIDATE_DEBOUNCE_MS);

        // The signature round-trips against the BRIDGE-01 verifier contract, including the
        // {current, previous} dual-accept rotation envelope.
        const signature = headers[HMAC_HEADER] ?? null;
        expect(signature).toBe(await hmacBase64(sentBody, SECRET));
        expect(await verifyBridgeHmac(sentBody, signature, { current: SECRET })).toBe(true);
        expect(await verifyBridgeHmac(sentBody, signature, { current: ROTATED_SECRET, previous: SECRET })).toBe(true);
        expect(await verifyBridgeHmac(sentBody, signature, { current: ROTATED_SECRET })).toBe(false);
        expect(await verifyBridgeHmac(sentBody, null, { current: SECRET })).toBe(false);

        // The 2xx acked the window and nothing further is in flight.
        expect(await t.run((ctx) => ctx.db.query('pendingRevalidations').collect())).toHaveLength(0);
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('collapses a rapid publish burst into one debounced delivery (coalescing + eventId dedup)', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@burst.example.com', 'legacy-burst');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|op', email: 'op@burst.example.com' });

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const first = await asOp.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'About', slug: 'about' },
            status: 'published',
        });
        for (let i = 0; i < 4; i++) {
            await asOp.mutation(saveRef, {
                documentId: first.documentId,
                collection: 'pages',
                data: { title: `About v${i + 2}`, slug: 'about' },
                status: 'published',
            });
        }

        await step(t);

        // Five publishes, five distinct recorded events — but ONE window and ONE armed notify.
        expect(await t.run((ctx) => ctx.db.query('revalidationEvents').collect())).toHaveLength(5);
        expect(await t.run((ctx) => ctx.db.query('pendingRevalidations').collect())).toHaveLength(1);
        const notifyJobs = (await scheduledJobs(t)).filter(
            (job) => job.name === 'revalidate/notify:notify' && job.state.kind === 'pending',
        );
        expect(notifyJobs).toHaveLength(1);

        vi.advanceTimersByTime(REVALIDATE_DEBOUNCE_MS);
        await t.finishInProgressScheduledFunctions();

        // The burst delivered exactly once, with exactly the coalesced fanout.
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0] ?? [];
        const parsed = JSON.parse(init?.body as string) as { tags: string[] };
        expect(parsed.tags).toEqual(
            deriveRevalidateTags({ collection: 'pages', key: 'about', tenantId: 'legacy-burst' }),
        );

        await t.finishAllScheduledFunctions(vi.runAllTimers);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe('GATE G3 — forced non-2xx → bounded retries → dead-letter (exit criterion 2)', () => {
    it('retries a 500 target to exhaustion, then writes exactly one dead-letter row and drops the poison window', async () => {
        const t = convexTest(schema, modules);
        registerActionRetrier(t);
        await seedShop(t, 'legacy-poison', 'poison.example.com');
        const tags = deriveRevalidateTags({ collection: 'pages', key: 'about', tenantId: 'legacy-poison' });
        const pendingId = await seedWindow(t, 'legacy-poison', tags);

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 500 }));
        vi.stubGlobal('fetch', fetchMock);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await t.mutation(enqueueRef, { pendingId });
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        // Bounded: one initial attempt plus maxFailures retries — never an unbounded re-fire loop.
        expect(fetchMock).toHaveBeenCalledTimes(DELIVERY_RETRY_OPTIONS.maxFailures + 1);

        // Exactly one dead-letter row, carrying the lost window's full delivery context.
        const deadLetters = await t.run((ctx) => ctx.db.query('revalidationDeadLetters').collect());
        expect(deadLetters).toHaveLength(1);
        expect(deadLetters[0]?.tenantId).toBe('legacy-poison');
        expect(deadLetters[0]?.collection).toBe('pages');
        expect(deadLetters[0]?.tags).toEqual(tags);
        expect(deadLetters[0]?.error.length).toBeGreaterThan(0);
        expect(countAlerts(errorSpy)).toBe(1);

        // The poison window is dropped and the in-flight ledger is clean.
        expect(await t.run((ctx) => ctx.db.query('pendingRevalidations').collect())).toHaveLength(0);
        expect(await t.run((ctx) => ctx.db.query('revalidationDeliveries').collect())).toHaveLength(0);
    });
});

describe('GATE G3 — dropped event self-heals via the reconciliation cron (exit criterion 2)', () => {
    it('replays stale un-acked windows through the durable path, rate-limited per pass, and is idempotent', async () => {
        const t = convexTest(schema, modules);
        registerActionRetrier(t);
        await seedShop(t, 'legacy-heal-a', 'heal-a.example.com');
        await seedShop(t, 'legacy-heal-b', 'heal-b.example.com');

        // Two deliveries whose scheduled runs were dropped: the windows linger un-acked...
        await seedWindow(t, 'legacy-heal-a', deriveRevalidateTags({ collection: 'pages', tenantId: 'legacy-heal-a' }));
        await seedWindow(t, 'legacy-heal-b', deriveRevalidateTags({ collection: 'pages', tenantId: 'legacy-heal-b' }));
        // ...and time advances past the staleness floor, marking them lost.
        vi.advanceTimersByTime(RECONCILE_THROTTLE.staleAfterMs + 60_000);

        // The selection is rate-limited per pass: with limit 1, only one lost window is adopted.
        const limited = (await t.query(listLostRef, {
            now: Date.now(),
            staleAfterMs: RECONCILE_THROTTLE.staleAfterMs,
            limit: 1,
        })) as Array<Id<'pendingRevalidations'>>;
        expect(limited).toHaveLength(1);

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        // The cron handler replays both lost windows through the durable retrier path.
        await t.action(reconcileRef, {});
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        const urls = fetchMock.mock.calls.map(([target]) => target);
        expect(urls).toContain('https://heal-a.example.com/api/revalidate/convex');
        expect(urls).toContain('https://heal-b.example.com/api/revalidate/convex');

        // Successful replays ack-and-drain the windows...
        expect(await t.run((ctx) => ctx.db.query('pendingRevalidations').collect())).toHaveLength(0);

        // ...so a second pass is a clean-cursor no-op — never a global full-revalidate.
        await t.action(reconcileRef, {});
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

describe('GATE G3 — autosave/draft loop is revalidation-quiet (exit criterion 3)', () => {
    it('schedules ZERO revalidation work across a 10-save draft loop that really persists', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@quiet.example.com', 'legacy-quiet');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|op', email: 'op@quiet.example.com' });

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const first = await asOp.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'Draft v1', slug: '' },
            status: 'draft',
        });
        for (let i = 0; i < 9; i++) {
            await asOp.mutation(saveRef, {
                documentId: first.documentId,
                collection: 'pages',
                data: { title: `Draft v${i + 2}`, slug: '' },
                status: 'draft',
            });
        }
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        // The loop did real work — ten version snapshots landed — so the quiet invariant is not vacuous.
        expect(await t.run((ctx) => ctx.db.query('cmsVersions').collect())).toHaveLength(10);

        // And it was revalidation-quiet: zero scheduled functions of ANY kind, zero windows, zero
        // recorded events, zero in-flight deliveries, zero HTTP traffic.
        expect(await scheduledJobs(t)).toHaveLength(0);
        expect(await t.run((ctx) => ctx.db.query('pendingRevalidations').collect())).toHaveLength(0);
        expect(await t.run((ctx) => ctx.db.query('revalidationEvents').collect())).toHaveLength(0);
        expect(await t.run((ctx) => ctx.db.query('revalidationDeliveries').collect())).toHaveLength(0);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

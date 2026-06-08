import { register as registerActionRetrier } from '@convex-dev/action-retrier/test';
import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { RECONCILE_THROTTLE } from './reconcile';

const reconcileRef = makeFunctionReference<'action'>('revalidate/reconcile:reconcile');
const listLostRef = makeFunctionReference<'query'>('revalidate/reconcile:listLostWindows');

/**
 * Module map for `convex-test`. The reconciliation module plus the durable-delivery and notify modules
 * it replays through are mapped so their `FunctionReference`s resolve; the dummy `_generated` key only
 * anchors convex-test's shared `/convex/` module-root detection (see `revalidate/delivery.test.ts`).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/revalidate/reconcile.ts': () => import('./reconcile'),
    '/convex/revalidate/delivery.ts': () => import('./delivery'),
    '/convex/revalidate/notify.ts': () => import('./notify'),
};

const SECRET = 'convex-current-secret';
const STALE = RECONCILE_THROTTLE.staleAfterMs;

/**
 * Seeds a shop addressable by reconciliation's tenant→storefront resolution, keyed by its legacy id.
 *
 * @param t - The convex-test harness.
 * @param legacyId - The legacy shop id the pending window's `tenantId` resolves against.
 * @param domain - The shop's custom storefront host the replayed delivery POSTs to.
 * @returns Resolves once the shop row is inserted.
 */
async function seedShop(t: ReturnType<typeof convexTest>, legacyId: string, domain: string): Promise<void> {
    await t.run(async (ctx) => {
        await ctx.db.insert('shops', {
            legacyId,
            name: 'Demo Shop',
            domain,
            design: {
                header: { logo: { width: 1, height: 1, src: 'https://example.com/logo.png', alt: 'logo' } },
                accents: [],
            },
            commerceProvider: {
                type: 'shopify',
                authentication: { publicToken: 'public-token' },
                storefrontId: 'sf-1',
                domain: 'mock.shop',
                id: 'shop-1',
            },
            createdAt: 0,
            updatedAt: 0,
        });
    });
}

/**
 * Seeds a pending (unacked) coalescing window for a tenant, stamped at the current fake-clock time so
 * its `_creationTime` cursor is controllable by the caller advancing timers before/after seeding.
 *
 * @param t - The convex-test harness.
 * @param tenantId - The string tenant id the window belongs to.
 * @returns The seeded `pendingRevalidations` row id.
 */
async function seedWindow(t: ReturnType<typeof convexTest>, tenantId: string): Promise<Id<'pendingRevalidations'>> {
    return t.run((ctx) =>
        ctx.db.insert('pendingRevalidations', {
            tenantId,
            collection: 'pages',
            tags: [`cms.${tenantId}.pages.about`, `cms.${tenantId}.pages`],
        }),
    );
}

describe('reconcile (low-frequency lost-event self-heal cron)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
        vi.stubEnv('CONVEX_REVALIDATE_SECRET', SECRET);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('configures a rate-limited reconciliation policy', () => {
        // The replay is throttled: a bounded per-pass fan-out and a non-trivial staleness floor.
        expect(RECONCILE_THROTTLE.maxPerPass).toBeGreaterThan(0);
        expect(Number.isFinite(RECONCILE_THROTTLE.maxPerPass)).toBe(true);
        expect(RECONCILE_THROTTLE.staleAfterMs).toBeGreaterThan(0);
    });

    it('selects only stale unacked windows — skips fresh and in-flight ones, and never broad-sweeps', async () => {
        const t = convexTest(schema, modules);

        // A stale (lost) window seeded in the past, then time advanced past the staleness floor.
        const lostId = await seedWindow(t, 'legacy-stale');
        vi.advanceTimersByTime(STALE + 60_000);
        // A fresh window seeded at "now" — inside its live delivery lifecycle.
        const freshId = await seedWindow(t, 'legacy-fresh');
        // A second stale window, but one with an in-flight retrier delivery already adopting it.
        const inflightId = await seedWindow(t, 'legacy-inflight');
        await t.run((ctx) =>
            ctx.db.insert('revalidationDeliveries', {
                runId: 'run-inflight',
                pendingId: inflightId,
                tenantId: 'legacy-inflight',
                collection: 'pages',
                tags: ['cms.legacy-inflight.pages'],
            }),
        );

        const selected = (await t.query(listLostRef, {
            now: Date.now(),
            staleAfterMs: STALE,
            limit: RECONCILE_THROTTLE.maxPerPass,
        })) as Array<Id<'pendingRevalidations'>>;

        // Cursor-scoped: ONLY the genuinely-lost window is replayed — not the fresh in-window row, not
        // the one a retrier is already delivering, and never a blanket sweep of every window.
        expect(selected).toEqual([lostId]);
        expect(selected).not.toContain(freshId);
        expect(selected).not.toContain(inflightId);
    });

    it('honors the per-pass rate limit when many windows are lost', async () => {
        const t = convexTest(schema, modules);

        await seedWindow(t, 'legacy-a');
        await seedWindow(t, 'legacy-b');
        await seedWindow(t, 'legacy-c');
        vi.advanceTimersByTime(STALE + 60_000);

        const selected = (await t.query(listLostRef, {
            now: Date.now(),
            staleAfterMs: STALE,
            limit: 2,
        })) as Array<Id<'pendingRevalidations'>>;

        expect(selected).toHaveLength(2);
    });

    it('self-heals a dropped event on the next pass while skipping clean-cursor tenants', async () => {
        const t = convexTest(schema, modules);
        registerActionRetrier(t);
        await seedShop(t, 'legacy-lost', 'lost-shop.example.com');
        await seedShop(t, 'legacy-clean', 'clean-shop.example.com');

        // A delivery whose durable run was permanently lost: the window lingers unacked and aged out.
        await seedWindow(t, 'legacy-lost');
        vi.advanceTimersByTime(STALE + 60_000);
        // A clean-cursor tenant (legacy-clean) has NO pending window at all.

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await t.action(reconcileRef, {});
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        // The dropped event self-healed: exactly one replay, POSTed to the lost tenant's storefront.
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url] = fetchMock.mock.calls[0] ?? [];
        expect(url).toBe('https://lost-shop.example.com/api/revalidate/convex');

        // A successful replay acks-and-drains the window, so the next pass would skip it (no-op).
        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(0);

        // The clean-cursor tenant was never contacted — reconciliation is not a global full-revalidate.
        const clean = fetchMock.mock.calls.find(
            (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('clean-shop'),
        );
        expect(clean).toBeUndefined();
    });

    it('does nothing when every tenant has a clean cursor', async () => {
        const t = convexTest(schema, modules);
        registerActionRetrier(t);
        await seedShop(t, 'legacy-clean', 'clean-shop.example.com');

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await t.action(reconcileRef, {});
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        expect(fetchMock).not.toHaveBeenCalled();
    });
});

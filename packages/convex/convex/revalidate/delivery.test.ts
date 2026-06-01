import { register as registerActionRetrier } from '@convex-dev/action-retrier/test';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { DELIVERY_RETRY_OPTIONS } from './delivery';

const enqueueRef = makeFunctionReference<'mutation'>('revalidate/delivery:enqueueDelivery');

/**
 * Module map for `convex-test`. The real `revalidate/delivery` and `revalidate/notify` modules are
 * mapped so the durable-delivery mutation, its `onDeliveryComplete`/`emitDeadLetterAlert` siblings, and
 * the retried `notify` action resolve by `FunctionReference`; the dummy `_generated` key only anchors
 * convex-test's shared `/convex/` module-root detection (see `revalidate/notify.test.ts`).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/revalidate/delivery.ts': () => import('./delivery'),
    '/convex/revalidate/notify.ts': () => import('./notify'),
};

const SECRET = 'convex-current-secret';
const ALERT_MARKER = 'revalidation delivery dead-lettered';

/**
 * Seeds a shop and a pending coalescing row, returning the pending row id the delivery runs against.
 *
 * @param t - The convex-test harness.
 * @returns The seeded `pendingRevalidations` row id.
 */
async function seedDelivery(t: ReturnType<typeof convexTest>): Promise<Id<'pendingRevalidations'>> {
    return t.run(async (ctx) => {
        await ctx.db.insert('shops', {
            legacyId: 'legacy-shop-1',
            name: 'Demo Shop',
            domain: 'custom-shop.example.com',
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
        return ctx.db.insert('pendingRevalidations', {
            tenantId: 'legacy-shop-1',
            collection: 'pages',
            tags: ['cms.legacy-shop-1.pages.about', 'cms.legacy-shop-1.pages'],
        });
    });
}

/**
 * Counts the dead-letter alert lines captured by a `console.error` spy, ignoring the action-retrier
 * component's own per-failure error logs by matching only this module's structured alert marker.
 *
 * @param spy - The `console.error` spy.
 * @returns The number of dead-letter alerts emitted.
 */
function countAlerts(spy: ReturnType<typeof vi.spyOn>): number {
    return spy.mock.calls.filter((call: unknown[]) => typeof call[0] === 'string' && call[0].includes(ALERT_MARKER))
        .length;
}

describe('delivery (durable Convex→Next revalidation via action-retrier)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubEnv('CONVEX_REVALIDATE_SECRET', SECRET);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('configures a bounded exponential backoff policy', () => {
        expect(DELIVERY_RETRY_OPTIONS.base).toBeGreaterThan(1);
        expect(DELIVERY_RETRY_OPTIONS.initialBackoffMs).toBeGreaterThan(0);
        expect(DELIVERY_RETRY_OPTIONS.maxFailures).toBeGreaterThan(0);
        expect(Number.isFinite(DELIVERY_RETRY_OPTIONS.maxFailures)).toBe(true);
    });

    it('retries a forced non-2xx target to exhaustion, then writes exactly one dead-letter row and fires the alert', async () => {
        const t = convexTest(schema, modules);
        registerActionRetrier(t);
        const pendingId = await seedDelivery(t);

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
        vi.stubGlobal('fetch', fetchMock);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await t.mutation(enqueueRef, { pendingId });
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        // Every attempt fired: one initial execution plus `maxFailures` retries.
        expect(fetchMock).toHaveBeenCalledTimes(DELIVERY_RETRY_OPTIONS.maxFailures + 1);

        // Exactly one dead-letter row, carrying the full delivery context.
        const deadLetters = await t.run((ctx) => ctx.db.query('revalidationDeadLetters').collect());
        expect(deadLetters).toHaveLength(1);
        expect(deadLetters[0]?.tenantId).toBe('legacy-shop-1');
        expect(deadLetters[0]?.collection).toBe('pages');
        expect(deadLetters[0]?.tags).toEqual(['cms.legacy-shop-1.pages.about', 'cms.legacy-shop-1.pages']);
        expect(deadLetters[0]?.error.length).toBeGreaterThan(0);

        // The alert fired exactly once.
        expect(countAlerts(errorSpy)).toBe(1);

        // The poison window is dropped and no in-flight context row lingers.
        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(0);
        const deliveries = await t.run((ctx) => ctx.db.query('revalidationDeliveries').collect());
        expect(deliveries).toHaveLength(0);
    });

    it('acks and cleans up without dead-lettering when the storefront returns 2xx', async () => {
        const t = convexTest(schema, modules);
        registerActionRetrier(t);
        const pendingId = await seedDelivery(t);

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await t.mutation(enqueueRef, { pendingId });
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        // A single successful delivery: no retries, no dead-letter, no alert.
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const deadLetters = await t.run((ctx) => ctx.db.query('revalidationDeadLetters').collect());
        expect(deadLetters).toHaveLength(0);
        expect(countAlerts(errorSpy)).toBe(0);

        // The window is acked (drained) and the in-flight context row is cleaned up.
        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(0);
        const deliveries = await t.run((ctx) => ctx.db.query('revalidationDeliveries').collect());
        expect(deliveries).toHaveLength(0);
    });

    it('no-ops when the pending row was already drained before enqueue', async () => {
        const t = convexTest(schema, modules);
        registerActionRetrier(t);
        const pendingId = await seedDelivery(t);
        await t.run((ctx) => ctx.db.delete('pendingRevalidations', pendingId));

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await t.mutation(enqueueRef, { pendingId });
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        expect(fetchMock).not.toHaveBeenCalled();
        const deliveries = await t.run((ctx) => ctx.db.query('revalidationDeliveries').collect());
        expect(deliveries).toHaveLength(0);
    });
});

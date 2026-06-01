import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { describe, expect, it, vi } from 'vitest';

import schema from '../schema';
import { systemMutation } from '../lib/system';
import { coalescePending, isStale } from './idempotency';

/**
 * The autosave debounce window a publish arms its single delivery against; an arbitrary positive delay
 * so the scheduled notify stays pending (not yet fired) while the test inspects the coalesced state.
 */
const DEBOUNCE_MS = 2_000;

/**
 * Fixture standing in for BRIDGE-05's delivery function: when the window's debounce elapses it removes
 * the pending row, modeling the contract that a fired delivery closes the window so the NEXT publish
 * re-arms from scratch. Not exported (Biome forbids exports from a test file); resolved by
 * `FunctionReference` through the hand-built module map below.
 */
const notify = systemMutation({
    args: { tenantId: v.string(), collection: v.string() },
    handler: async (ctx, { tenantId, collection }) => {
        const pending = await ctx.db
            .query('pendingRevalidations')
            .withIndex('by_tenant_collection', (q) => q.eq('tenantId', tenantId).eq('collection', collection))
            .unique();
        if (pending) {
            await ctx.db.delete('pendingRevalidations', pending._id);
        }
    },
});

const notifyRef = makeFunctionReference<'mutation'>('revalidate/idempotency.test:notify');

/**
 * Fixture standing in for BRIDGE-05's publish path: coalesces the publish, then — ONLY when no delivery
 * is already armed — schedules the single notify post-commit via `scheduler.runAfter` and stamps the
 * scheduled-job handle back onto the pending row. This is the caller-side half {@link coalescePending}
 * deliberately leaves to the publish path, exercised here to prove rapid publishes schedule at most one
 * notify. Not exported; resolved by `FunctionReference` through the module map below.
 */
const publish = systemMutation({
    args: { tenantId: v.string(), collection: v.string(), tags: v.array(v.string()) },
    handler: async (ctx, args) => {
        const { alreadyScheduled, pendingId } = await coalescePending(ctx, args);
        if (!alreadyScheduled) {
            const jobId = await ctx.scheduler.runAfter(DEBOUNCE_MS, notifyRef, {
                tenantId: args.tenantId,
                collection: args.collection,
            });
            await ctx.db.patch('pendingRevalidations', pendingId, { scheduledJobId: jobId });
        }
        return { alreadyScheduled };
    },
});

const publishRef = makeFunctionReference<'mutation'>('revalidate/idempotency.test:publish');
const recordEventRef = makeFunctionReference<'mutation'>('revalidate/idempotency:recordEvent');
const coalesceRef = makeFunctionReference<'mutation'>('revalidate/idempotency:coalesce');

/**
 * Hand-built module map (see `lib/system.test.ts` for the rationale): the default `import.meta.glob`
 * convex-test derives excludes the self-importing test module, so the fixtures are mapped explicitly
 * to resolve by `FunctionReference`. The real `revalidate/idempotency` module is mapped so the
 * `recordEvent`/`coalesce` system functions resolve, and the dummy `_generated` key only anchors
 * convex-test's shared `/convex/` module-root detection.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/revalidate/idempotency.ts': () => import('./idempotency'),
    '/convex/revalidate/idempotency.test.ts': () => Promise.resolve({ notify, publish }),
};

describe('isStale', () => {
    const WINDOW = 5 * 60 * 1_000;
    const NOW = 1_700_000_000_000;

    it('rejects a ts older than the replay window', () => {
        expect(isStale(NOW - WINDOW - 1, WINDOW, NOW)).toBe(true);
    });

    it('accepts a ts exactly at the window boundary as fresh', () => {
        expect(isStale(NOW - WINDOW, WINDOW, NOW)).toBe(false);
    });

    it('accepts a ts inside the window', () => {
        expect(isStale(NOW - 1, WINDOW, NOW)).toBe(false);
    });
});

describe('recordEvent (eventId dedup)', () => {
    it('records a new eventId once and treats an exact duplicate as a verified no-op', async () => {
        const t = convexTest(schema, modules);

        expect(await t.mutation(recordEventRef, { eventId: 'evt_1' })).toBe(true);
        expect(await t.mutation(recordEventRef, { eventId: 'evt_1' })).toBe(false);

        const afterDuplicate = await t.run((ctx) => ctx.db.query('revalidationEvents').collect());
        expect(afterDuplicate).toHaveLength(1);

        expect(await t.mutation(recordEventRef, { eventId: 'evt_2' })).toBe(true);
        const afterDistinct = await t.run((ctx) => ctx.db.query('revalidationEvents').collect());
        expect(afterDistinct).toHaveLength(2);
    });
});

describe('coalesce (per-(tenant,collection) debounce)', () => {
    it('merges the standalone coalesce mutation into one pending row, de-duplicating tags', async () => {
        const t = convexTest(schema, modules);

        await t.mutation(coalesceRef, {
            tenantId: 'shop_1',
            collection: 'pages',
            tags: ['cms.shop_1.pages.about', 'cms.shop_1.pages', 'cms'],
        });
        await t.mutation(coalesceRef, {
            tenantId: 'shop_1',
            collection: 'pages',
            tags: ['cms.shop_1.pages.contact', 'cms.shop_1.pages', 'cms'],
        });

        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(1);
        expect(pending[0]?.tags).toEqual([
            'cms.shop_1.pages.about',
            'cms.shop_1.pages',
            'cms',
            'cms.shop_1.pages.contact',
        ]);
    });

    it('collapses two rapid publishes into one pending row and schedules at most one notify', async () => {
        const t = convexTest(schema, modules);

        const first = await t.mutation(publishRef, {
            tenantId: 'shop_1',
            collection: 'pages',
            tags: ['cms.shop_1.pages.about', 'cms.shop_1.pages', 'cms'],
        });
        const second = await t.mutation(publishRef, {
            tenantId: 'shop_1',
            collection: 'pages',
            tags: ['cms.shop_1.pages.contact', 'cms.shop_1.pages', 'cms'],
        });

        // Only the first publish owns scheduling; the second sees a delivery already armed.
        expect(first.alreadyScheduled).toBe(false);
        expect(second.alreadyScheduled).toBe(true);

        // One coalesced row carrying the de-duplicated union of both publishes' tags.
        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(1);
        expect(pending[0]?.tags).toEqual([
            'cms.shop_1.pages.about',
            'cms.shop_1.pages',
            'cms',
            'cms.shop_1.pages.contact',
        ]);

        // Exactly one delivery scheduled, and its handle is the one stamped on the coalesced row.
        const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
        expect(scheduled).toHaveLength(1);
        expect(pending[0]?.scheduledJobId).toBe(scheduled[0]?._id);
    });

    it('keys the window per (tenant,collection): a different collection or tenant arms its own notify', async () => {
        const t = convexTest(schema, modules);

        const pages = await t.mutation(publishRef, { tenantId: 'shop_1', collection: 'pages', tags: ['t1'] });
        const articles = await t.mutation(publishRef, { tenantId: 'shop_1', collection: 'articles', tags: ['t2'] });
        const otherShop = await t.mutation(publishRef, { tenantId: 'shop_2', collection: 'pages', tags: ['t3'] });

        expect(pages.alreadyScheduled).toBe(false);
        expect(articles.alreadyScheduled).toBe(false);
        expect(otherShop.alreadyScheduled).toBe(false);

        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(3);
        const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
        expect(scheduled).toHaveLength(3);
    });

    it('drains the pending row when the scheduled notify fires, re-arming the next publish', async () => {
        vi.useFakeTimers();
        try {
            const t = convexTest(schema, modules);

            await t.mutation(publishRef, { tenantId: 'shop_1', collection: 'pages', tags: ['t1'] });
            await t.finishAllScheduledFunctions(vi.runAllTimers);

            const drained = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
            expect(drained).toHaveLength(0);

            const reArmed = await t.mutation(publishRef, { tenantId: 'shop_1', collection: 'pages', tags: ['t2'] });
            expect(reArmed.alreadyScheduled).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });
});

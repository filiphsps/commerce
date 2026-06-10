import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { systemMutation } from '../lib/system';
import schema from '../schema';
import { REVALIDATE_DEBOUNCE_MS } from './onPublish';

/**
 * Fixed wall clock for every case, so a scheduled function's `scheduledTime` is an exact, assertable
 * function of {@link REVALIDATE_DEBOUNCE_MS} rather than a wobbling real-time delta.
 */
const NOW = 1_700_000_000_000;

/**
 * Fixture mirroring `cms/documents.ts`'s publish gate: it schedules the post-commit `onPublish` hop
 * ONLY when the save's status is `published`, exactly as the live `save` mutation does. Modeled here as
 * a `systemMutation` so the publish-only branch is exercised WITHOUT standing up the tenant-auth
 * identity the real `tenantMutation` requires — the gate under test is the `status === 'published'`
 * condition, not the auth resolution. Not exported (Biome forbids exports from a test module); resolved
 * by `FunctionReference` through the hand-built module map below.
 */
const dispatchSave = systemMutation({
    args: {
        shopId: v.id('shops'),
        collection: v.string(),
        key: v.optional(v.string()),
        status: v.string(),
        eventId: v.string(),
    },
    handler: async (ctx, { shopId, collection, key, status, eventId }): Promise<void> => {
        if (status === 'published') {
            await ctx.scheduler.runAfter(0, internal.revalidate.onPublish.onPublish, {
                shopId,
                collection,
                key,
                eventId,
            });
        }
    },
});

const onPublishRef = makeFunctionReference<'mutation'>('revalidate/onPublish:onPublish');
const dispatchSaveRef = makeFunctionReference<'mutation'>('revalidate/onPublish.test:dispatchSave');

/**
 * Hand-built module map (see `revalidate/idempotency.test.ts` for the rationale): the default
 * `import.meta.glob` convex-test derives excludes the self-importing test module, so the real
 * `revalidate/onPublish` module is mapped explicitly (resolving the `onPublish` system mutation it
 * schedules the durable delivery from), the local `dispatchSave` fixture is mapped under the test path, and the
 * dummy `_generated` key only anchors convex-test's shared `/convex/` module-root detection.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/revalidate/onPublish.ts': () => import('./onPublish'),
    '/convex/revalidate/onPublish.test.ts': () => Promise.resolve({ dispatchSave }),
};

/**
 * Seeds the tenant `onPublish` resolves its STRING `legacyId` from, returning the Convex `shops` id the
 * publish hook is invoked with. The `legacyId` is the bridge tenant key every derived tag is prefixed
 * with, so it is asserted against in the tag expectations below.
 *
 * @param t - The convex-test harness.
 * @returns The seeded `shops` row id.
 */
async function seedShop(t: ReturnType<typeof convexTest>): Promise<Id<'shops'>> {
    return t.run((ctx) =>
        ctx.db.insert('shops', {
            legacyId: 'legacy-shop-1',
            name: 'Demo Shop',
            domain: 'demo.example.com',
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
        }),
    );
}

beforeEach(() => {
    // Fake timers pin the clock AND keep every scheduled `setTimeout` parked: the harness records the
    // `_scheduled_functions` row synchronously but never fires the delivery action (a real `fetch`), so
    // the tests inspect the armed-but-pending schedule without advancing into it.
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('onPublish (publish transition → single coalesced durable delivery)', () => {
    it('schedules exactly one durable delivery after the debounce window and stamps its handle on the coalesced row', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedShop(t);

        const result = await t.mutation(onPublishRef, { shopId, collection: 'pages', key: 'about', eventId: 'evt-1' });
        expect(result.scheduled).toBe(true);

        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(1);
        expect(pending[0]?.tenantId).toBe('legacy-shop-1');
        expect(pending[0]?.collection).toBe('pages');
        expect(pending[0]?.tags).toEqual([
            'cms.legacy-shop-1.pages.about',
            'cms.legacy-shop-1.pages',
            'cms.legacy-shop-1',
            'cms',
        ]);

        // The debounced hop targets the retrier entry point (`enqueueDelivery`), never `notify`
        // directly — attempt #1 must already run under the bounded-backoff durability policy.
        const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
        expect(scheduled).toHaveLength(1);
        expect(scheduled[0]?.name).toBe('revalidate/delivery:enqueueDelivery');
        expect(scheduled[0]?.args[0]?.pendingId).toBe(pending[0]?._id);
        expect(scheduled[0]?.scheduledTime).toBe(NOW + REVALIDATE_DEBOUNCE_MS);
        expect(pending[0]?.scheduledJobId).toBe(scheduled[0]?._id);
    });

    it('collapses a burst of 12 rapid same-collection publishes into a single durable delivery', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedShop(t);

        const results: Array<{ scheduled: boolean }> = [];
        for (let i = 0; i < 12; i++) {
            results.push(
                await t.mutation(onPublishRef, { shopId, collection: 'pages', key: `page-${i}`, eventId: `evt-${i}` }),
            );
        }

        // Only the first publish in the window arms a delivery; every later one coalesces.
        expect(results.filter((r) => r.scheduled)).toHaveLength(1);
        expect(results[0]?.scheduled).toBe(true);
        expect(results.slice(1).every((r) => !r.scheduled)).toBe(true);

        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(1);

        const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
        expect(scheduled).toHaveLength(1);
        expect(scheduled[0]?.name).toBe('revalidate/delivery:enqueueDelivery');
    });

    it('treats a redelivered eventId as a verified no-op, even across collections', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedShop(t);

        // A fresh eventId arms the pages window...
        const first = await t.mutation(onPublishRef, { shopId, collection: 'pages', key: 'about', eventId: 'dupe' });
        // ...and a redelivery of the SAME eventId for a DIFFERENT collection is deduped before it can
        // coalesce a second window — proving the dedup gate, not merely the per-window coalescing.
        const second = await t.mutation(onPublishRef, { shopId, collection: 'articles', key: 'news', eventId: 'dupe' });

        expect(first.scheduled).toBe(true);
        expect(second.scheduled).toBe(false);

        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(1);
        expect(pending[0]?.collection).toBe('pages');

        const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
        expect(scheduled).toHaveLength(1);

        const events = await t.run((ctx) => ctx.db.query('revalidationEvents').collect());
        expect(events).toHaveLength(1);
    });
});

describe('publish-only gating (autosave / draft → zero revalidation work)', () => {
    it('schedules nothing across a 12-save autosave/draft loop', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedShop(t);

        for (let i = 0; i < 12; i++) {
            await t.mutation(dispatchSaveRef, {
                shopId,
                collection: 'pages',
                key: 'about',
                status: 'draft',
                eventId: `evt-${i}`,
            });
        }

        const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
        expect(scheduled).toHaveLength(0);
        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(0);
    });

    it('schedules the post-commit onPublish hop ONLY on the published transition', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedShop(t);

        // A draft save in the same window schedules nothing.
        await t.mutation(dispatchSaveRef, {
            shopId,
            collection: 'pages',
            key: 'about',
            status: 'draft',
            eventId: 'draft-1',
        });
        expect(await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect())).toHaveLength(0);

        // The publish transition schedules exactly one onPublish hop, post-commit (delay 0).
        await t.mutation(dispatchSaveRef, {
            shopId,
            collection: 'pages',
            key: 'about',
            status: 'published',
            eventId: 'publish-1',
        });

        const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
        expect(scheduled).toHaveLength(1);
        expect(scheduled[0]?.name).toBe('revalidate/onPublish:onPublish');
        expect(scheduled[0]?.scheduledTime).toBe(NOW);
        expect(scheduled[0]?.args[0]?.eventId).toBe('publish-1');
    });
});

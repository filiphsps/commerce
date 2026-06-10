import { makeFunctionReference, type WithoutSystemFields } from 'convex/server';
import { convexTest, type TestConvex } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { expectedChecksums } from '../../../scripts/etl/reconcile/checksum';
import { type Doc as SourceDoc, type SourceDataset, transform } from '../../../scripts/etl/transform/index';
import { transformCmsDocuments } from '../../../scripts/etl/transform/shred-richtext';
import type { Doc, Id } from '../../convex/convex/_generated/dataModel';
import schema from '../../convex/convex/schema';
import { heading, lexicalDoc, paragraph } from '../../test-mongo/src/seed/fixtures/lexical';

/**
 * PIPELINE-04 end-to-end parity proof: seed → export-shape fixtures → PIPELINE-01/02 transform →
 * checksum BOTH sides → divergence ledger. Driven through `convex-test` (the in-memory backend) —
 * the run against the real imported deployment is the CUTOVER-01 dress rehearsal. Lives in this
 * harness package (not `packages/convex/convex/`) because the expected side imports the Node-typed
 * ETL scripts, which must stay out of the Convex function directory's codegen typecheck program.
 */

/** Stable source ObjectId hex strings so the staged surrogate graph is reproducible. */
const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9d1';
const FLAG_ID = '6630f1a2b3c4d5e6f7a8b9e1';
const REVIEW_ID = '6630f1a2b3c4d5e6f7a8b9f1';
const ARTICLE_ID = '6630f1a2b3c4d5e6f7a8b9c0';

/** The concretely-schema-typed convex-test harness, so seeded queries see the real indexes. */
type Harness = TestConvex<typeof schema>;

/**
 * Module map for `convex-test`: the real `reconcile` module so `run`/`checksumPage`/`recordParity`
 * resolve by `FunctionReference`; the dummy `_generated` key anchors the `/convex/` module root.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/reconcile.ts': () => import('../../convex/convex/reconcile'),
};

const runRef = makeFunctionReference<'action'>('reconcile:run');

/** The export-shape (mongoexport extended JSON) source corpus the canonical-seed round-trip uses. */
const source: SourceDataset = {
    shops: [
        {
            _id: { $oid: SHOP_ID },
            name: 'Fixture Shop',
            domain: 'fixture.example.com',
            alternativeDomains: ['alt.example.com'],
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Fixture' } },
                accents: [],
            },
            commerceProvider: {
                type: 'shopify',
                authentication: { token: 'shpat_secret', publicToken: 'public', domain: 'fixture.myshopify.com' },
                storefrontId: 'gid://shopify/Shop/1',
                domain: 'fixture.myshopify.com',
                id: 'shop-1',
            },
            featureFlags: [{ flag: { $oid: FLAG_ID } }],
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
        },
    ],
    featureFlags: [
        {
            _id: { $oid: FLAG_ID },
            key: 'fixture-flag',
            defaultValue: true,
            targeting: [],
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-04-30T00:00:00.000Z' },
        },
    ],
    reviews: [
        {
            _id: { $oid: REVIEW_ID },
            shop: { $oid: SHOP_ID },
            createdAt: { $date: '2024-05-02T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-02T00:00:00.000Z' },
        },
    ],
};

/** A localized article whose `body` shreds into per-locale `cms_i18n` side rows. */
const articles: SourceDoc[] = [
    {
        _id: { $oid: ARTICLE_ID },
        tenant: { $oid: SHOP_ID },
        title: { 'en-US': 'Title EN', 'sv-SE': 'Titel SV' },
        slug: 'hello-world',
        body: {
            'en-US': lexicalDoc([heading('Hello', 'h1'), paragraph('World')]),
            'sv-SE': lexicalDoc([heading('Hej', 'h1'), paragraph('Världen')]),
        },
        _status: 'published',
        createdAt: { $date: '2024-04-30T00:00:00.000Z' },
        updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
    },
];

/**
 * Seeds the convex-test world with the STAGED transform output — the canonical-seed import
 * round-trip: every staged row is inserted verbatim, with each surrogate reference swapped for the
 * real Convex id assigned at insert (exactly the relink the live import performs).
 *
 * @param t - The convex-test harness.
 * @returns Resolves once the world mirrors the staged dataset.
 */
async function seedFromTransform(t: Harness): Promise<void> {
    const dataset = transform(source);
    const staged = transformCmsDocuments('articles', articles);
    expect(staged.divergences).toEqual([]);

    await t.run(async (ctx) => {
        const shopIds = new Map<string, Id<'shops'>>();
        for (const row of dataset.shops) {
            shopIds.set(
                row.payloadId,
                await ctx.db.insert('shops', row.document as unknown as WithoutSystemFields<Doc<'shops'>>),
            );
        }
        const flagIds = new Map<string, Id<'featureFlags'>>();
        for (const row of dataset.featureFlags) {
            flagIds.set(
                row.payloadId,
                await ctx.db.insert(
                    'featureFlags',
                    row.document as unknown as WithoutSystemFields<Doc<'featureFlags'>>,
                ),
            );
        }
        const realShop = (surrogate: unknown): Id<'shops'> => {
            const real = shopIds.get(String(surrogate));
            if (!real) throw new TypeError(`unseeded shop surrogate ${String(surrogate)}`);
            return real;
        };
        for (const row of dataset.shopCredentials) {
            const { shop, ...rest } = row.document;
            await ctx.db.insert('shopCredentials', {
                ...(rest as Omit<WithoutSystemFields<Doc<'shopCredentials'>>, 'shop'>),
                shop: realShop(shop),
            });
        }
        for (const row of dataset.shopDomains) {
            await ctx.db.insert('shopDomains', {
                domain: String(row.document.domain),
                shop: realShop(row.document.shop),
            });
        }
        for (const row of dataset.shopFeatureFlags) {
            const flag = flagIds.get(String(row.document.flag));
            if (!flag) throw new TypeError('unseeded flag surrogate');
            await ctx.db.insert('shopFeatureFlags', { shop: realShop(row.document.shop), flag });
        }
        for (const row of dataset.reviews) {
            const { shopId, ...rest } = row.document;
            await ctx.db.insert('reviews', {
                ...(rest as Omit<WithoutSystemFields<Doc<'reviews'>>, 'shopId'>),
                shopId: realShop(shopId),
            });
        }
        const parentIds = new Map<string, Id<'cmsDocuments'>>();
        for (const row of staged.cmsDocuments) {
            const { shopId, ...rest } = row.document;
            parentIds.set(
                row.payloadId,
                await ctx.db.insert('cmsDocuments', {
                    ...(rest as Omit<WithoutSystemFields<Doc<'cmsDocuments'>>, 'shopId'>),
                    shopId: realShop(shopId),
                }),
            );
        }
        for (const row of staged.cms_i18n) {
            const { parentId: stagedParent, ...rest } = row.document;
            const parentId = parentIds.get(String(stagedParent));
            if (!parentId) throw new TypeError('unseeded cms parent surrogate');
            await ctx.db.insert('cms_i18n', {
                ...(rest as Omit<WithoutSystemFields<Doc<'cms_i18n'>>, 'parentId'>),
                parentId,
            });
        }
    });
}

/**
 * Reads one run's ledger rows directly off the table, sorted by collection.
 *
 * @param t - The convex-test harness.
 * @param runId - The run to read.
 * @returns The run's ledger rows.
 */
async function ledgerOf(t: Harness, runId: string): Promise<Doc<'reconciliationLedger'>[]> {
    return t.run(async (ctx) => {
        const rows = await ctx.db
            .query('reconciliationLedger')
            .withIndex('by_run', (q) => q.eq('runId', runId))
            .collect();
        return rows.sort((left, right) => (left.collection < right.collection ? -1 : 1));
    });
}

describe('PIPELINE-04 reconciliation — canonical-seed import round-trip (convex-test)', () => {
    it('a clean round-trip yields parity green end-to-end, in bounded single-row pages', async () => {
        const t = convexTest(schema, modules);
        await seedFromTransform(t);
        const expected = await expectedChecksums(source, { articles });

        const before = await t.run(async (ctx) => ({
            documents: (await ctx.db.query('cmsDocuments').collect()).length,
            sideRows: (await ctx.db.query('cms_i18n').collect()).length,
        }));

        // pageSize 1 forces every collection through multiple checksumPage batches.
        const summary = await t.action(runRef, { runId: 'run-green', expected, pageSize: 1 });
        expect(summary).toEqual({ collections: 7, mismatched: 0 });

        const ledger = await ledgerOf(t, 'run-green');
        expect(ledger.map((row) => [row.collection, row.status])).toEqual([
            ['cmsDocuments:articles', 'match'],
            ['featureFlags', 'match'],
            ['reviews', 'match'],
            ['shopCredentials', 'match'],
            ['shopDomains', 'match'],
            ['shopFeatureFlags', 'match'],
            ['shops', 'match'],
        ]);
        for (const row of ledger) {
            expect(row.actualCount).toBe(row.expectedCount);
            expect(row.actualRollup).toBe(row.expectedRollup);
            expect(row.expectedOnlySamples).toEqual([]);
            expect(row.actualOnlySamples).toEqual([]);
        }
        const domains = ledger.find((row) => row.collection === 'shopDomains');
        expect(domains?.actualCount).toBe(2);

        // Read-only on content: the sweep wrote nothing but the ledger.
        const after = await t.run(async (ctx) => ({
            documents: (await ctx.db.query('cmsDocuments').collect()).length,
            sideRows: (await ctx.db.query('cms_i18n').collect()).length,
        }));
        expect(after).toEqual(before);
    });

    it('a divergent document lands in the ledger as a mismatch with locatable hash samples', async () => {
        const t = convexTest(schema, modules);
        await seedFromTransform(t);
        const expected = await expectedChecksums(source, { articles });

        // Corrupt the imported world: drop one locale's shredded side row — the silent-data-loss
        // shape the reconciliation gate exists to catch.
        await t.run(async (ctx) => {
            const sideRows = await ctx.db.query('cms_i18n').collect();
            const victim = sideRows.find((row) => row.locale === 'sv-SE');
            if (!victim) throw new TypeError('expected a seeded sv-SE side row');
            await ctx.db.delete(victim._id);
        });

        const summary = await t.action(runRef, { runId: 'run-corrupt', expected, pageSize: 2 });
        expect(summary).toEqual({ collections: 7, mismatched: 1 });

        const ledger = await ledgerOf(t, 'run-corrupt');
        const articlesRow = ledger.find((row) => row.collection === 'cmsDocuments:articles');
        expect(articlesRow?.status).toBe('mismatch');
        // Counts agree (the parent row still exists) — the ROLLUP catches the content drift, and the
        // per-document samples name both sides' divergent hashes.
        expect(articlesRow?.actualCount).toBe(articlesRow?.expectedCount);
        expect(articlesRow?.actualRollup).not.toBe(articlesRow?.expectedRollup);
        expect(articlesRow?.expectedOnlySamples).toHaveLength(1);
        expect(articlesRow?.actualOnlySamples).toHaveLength(1);
        for (const row of ledger.filter((entry) => entry.collection !== 'cmsDocuments:articles')) {
            expect(row.status).toBe('match');
        }
    });

    it('a collection missing on the expected side can never read green', async () => {
        const t = convexTest(schema, modules);
        await seedFromTransform(t);
        const expected = (await expectedChecksums(source, { articles })).filter(
            (entry) => entry.collection !== 'shops',
        );

        const summary = await t.action(runRef, { runId: 'run-missing', expected, pageSize: 8 });
        expect(summary.mismatched).toBe(1);
        const ledger = await ledgerOf(t, 'run-missing');
        const shops = ledger.find((row) => row.collection === 'shops');
        expect(shops?.status).toBe('mismatch');
        expect(shops?.expectedCount).toBe(0);
        expect(shops?.actualCount).toBe(1);
    });
});

import { makeFunctionReference, type WithoutSystemFields } from 'convex/server';
import { convexTest, type TestConvex } from 'convex-test';
import { describe, expect, it } from 'vitest';

import type { CollectionChecksum } from '../../../scripts/etl/reconcile/checksum';
import {
    formatRehearsalReport,
    type RehearsalLedgerRow,
    type RehearsalSource,
    type RehearsalWorld,
    runRehearsal,
    type StagedRehearsalDataset,
} from '../../../scripts/etl/rehearsal/run';
import type { Doc as SourceDoc } from '../../../scripts/etl/transform/index';
import type { Doc, Id } from '../../convex/convex/_generated/dataModel';
import schema from '../../convex/convex/schema';
import { heading, lexicalDoc, list, paragraph } from '../../test-mongo/src/seed/fixtures/lexical';

/**
 * CUTOVER-01 dress rehearsal: the full export-shaped-input → transform → import → PIPELINE-04
 * dual-path checksum reconciliation cycle, orchestrated by the committed rehearsal driver
 * (`scripts/etl/rehearsal/run.ts`) against a `convex-test` world at a multi-tenant scale (24
 * tenants, every reconciled table populated, localized rich text shredding into `cms_i18n`).
 *
 * The GREEN run here is the recorded rehearsal in
 * `.specs/2026-05-30-convex-migration/cutover-budgets.md`; the corruption run proves the same
 * driver reads NO-GO when the imported world drifts, so the rehearsal cannot rubber-stamp.
 * Lives in this harness package for the same reason `reconcile-parity.test.ts` does: the expected
 * side imports the Node-typed ETL scripts, which must stay out of the Convex codegen program.
 */

/** Tenant scale of the rehearsal corpus. */
const SHOP_COUNT = 24;
/** Platform feature flags; each shop references two. */
const FLAG_COUNT = 8;
/** Reviews per shop. */
const REVIEWS_PER_SHOP = 4;
/** Localized rich-text articles per shop (registered shredded `body`). */
const ARTICLES_PER_SHOP = 3;
/** Block-built pages per shop (rich text embedded in `content` blocks — converts inline, no shred). */
const PAGES_PER_SHOP = 2;
/** Product-metadata documents per shop (registered shredded `descriptionOverride`). */
const PRODUCT_METADATA_PER_SHOP = 1;

/**
 * Builds a deterministic 24-hex source ObjectId, namespaced by family byte so ids never collide
 * across collections.
 *
 * @param family - One byte (0–255) naming the collection family.
 * @param n - The row ordinal within the family.
 * @returns The ObjectId hex string.
 */
const oid = (family: number, n: number): string =>
    `${family.toString(16).padStart(2, '0')}${n.toString(16).padStart(22, '0')}`;

/** A mongoexport extended-JSON date. */
const date = (iso: string): { $date: string } => ({ $date: iso });

/**
 * Builds the multi-tenant export-shaped rehearsal corpus: every PIPELINE-01 collection plus two
 * rich-text-bearing CMS collections with two locales per document.
 *
 * @returns The rehearsal source dataset.
 */
function buildCorpus(): RehearsalSource {
    const flags: SourceDoc[] = Array.from({ length: FLAG_COUNT }, (...[, index]) => ({
        _id: { $oid: oid(0xe1, index) },
        key: `flag-${index}`,
        defaultValue: index % 2 === 0,
        targeting: [],
        createdAt: date('2024-04-30T00:00:00.000Z'),
        updatedAt: date('2024-04-30T00:00:00.000Z'),
    }));

    const shops: SourceDoc[] = [];
    const reviews: SourceDoc[] = [];
    const articles: SourceDoc[] = [];
    const pages: SourceDoc[] = [];
    const productMetadata: SourceDoc[] = [];

    for (let s = 0; s < SHOP_COUNT; s += 1) {
        const shopOid = oid(0xd1, s);
        const domain = `tenant-${s}.example.com`;
        shops.push({
            _id: { $oid: shopOid },
            name: `Tenant ${s}`,
            domain,
            alternativeDomains: [`alt.${domain}`],
            design: {
                header: { logo: { width: 512, height: 512, src: `https://cdn/${s}.png`, alt: `Tenant ${s}` } },
                accents: [],
            },
            commerceProvider: {
                type: 'shopify',
                authentication: {
                    token: `shpat_secret_${s}`,
                    publicToken: `public_${s}`,
                    domain: `tenant-${s}.myshopify.com`,
                },
                storefrontId: `gid://shopify/Shop/${s + 1}`,
                domain: `tenant-${s}.myshopify.com`,
                id: `tenant-${s}`,
            },
            featureFlags: [
                { flag: { $oid: oid(0xe1, s % FLAG_COUNT) } },
                { flag: { $oid: oid(0xe1, (s + 3) % FLAG_COUNT) } },
            ],
            createdAt: date('2024-04-30T00:00:00.000Z'),
            updatedAt: date('2024-05-01T00:00:00.000Z'),
        });

        for (let r = 0; r < REVIEWS_PER_SHOP; r += 1) {
            reviews.push({
                _id: { $oid: oid(0xf1, s * REVIEWS_PER_SHOP + r) },
                shop: { $oid: shopOid },
                createdAt: date('2024-05-02T00:00:00.000Z'),
                updatedAt: date('2024-05-02T00:00:00.000Z'),
            });
        }

        for (let a = 0; a < ARTICLES_PER_SHOP; a += 1) {
            articles.push({
                _id: { $oid: oid(0xc0, s * ARTICLES_PER_SHOP + a) },
                tenant: { $oid: shopOid },
                title: { 'en-US': `Article ${a} of tenant ${s}`, 'sv-SE': `Artikel ${a} hos tenant ${s}` },
                slug: `article-${a}`,
                body: {
                    'en-US': lexicalDoc([
                        heading(`Article ${a}`, 'h1'),
                        paragraph(`Body for tenant ${s}, article ${a}.`),
                        list([`point one of ${a}`, `point two of ${a}`]),
                    ]),
                    'sv-SE': lexicalDoc([heading(`Artikel ${a}`, 'h1'), paragraph(`Brödtext ${s}/${a}.`)]),
                },
                _status: 'published',
                createdAt: date('2024-04-30T00:00:00.000Z'),
                updatedAt: date('2024-05-01T00:00:00.000Z'),
            });
        }

        for (let p = 0; p < PAGES_PER_SHOP; p += 1) {
            // The real pages shape: rich text rides `content` blocks (`blockType: 'rich-text'`),
            // which the transform converts INLINE — pages own no registered shredded field.
            pages.push({
                _id: { $oid: oid(0xc8, s * PAGES_PER_SHOP + p) },
                tenant: { $oid: shopOid },
                title: { 'en-US': `Page ${p}`, 'sv-SE': `Sida ${p}` },
                slug: p === 0 ? 'homepage' : `page-${p}`,
                content: [
                    {
                        blockType: 'rich-text',
                        id: `block-${s}-${p}`,
                        body: {
                            'en-US': lexicalDoc([heading(`Page ${p}`, 'h2'), paragraph(`Page body ${s}/${p}.`)]),
                            'sv-SE': lexicalDoc([heading(`Sida ${p}`, 'h2'), paragraph(`Sidtext ${s}/${p}.`)]),
                        },
                    },
                ],
                _status: 'published',
                createdAt: date('2024-04-30T00:00:00.000Z'),
                updatedAt: date('2024-05-01T00:00:00.000Z'),
            });
        }

        for (let m = 0; m < PRODUCT_METADATA_PER_SHOP; m += 1) {
            productMetadata.push({
                _id: { $oid: oid(0xcd, s * PRODUCT_METADATA_PER_SHOP + m) },
                tenant: { $oid: shopOid },
                handle: `product-${m}`,
                descriptionOverride: {
                    'en-US': lexicalDoc([paragraph(`Override for tenant ${s}, product ${m}.`)]),
                    'sv-SE': lexicalDoc([paragraph(`Beskrivning ${s}/${m}.`)]),
                },
                _status: 'published',
                createdAt: date('2024-04-30T00:00:00.000Z'),
                updatedAt: date('2024-05-01T00:00:00.000Z'),
            });
        }
    }

    return { core: { shops, featureFlags: flags, reviews }, cms: { articles, pages, productMetadata } };
}

/** The concretely-schema-typed convex-test harness, so seeded queries see the real indexes. */
type Harness = TestConvex<typeof schema>;

/** Module map anchoring `convex-test` at the real reconcile module (same shape as the parity suite). */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/reconcile.ts': () => import('../../convex/convex/reconcile'),
};

const runRef = makeFunctionReference<'action'>('reconcile:run');

/**
 * A {@link RehearsalWorld} over a fresh `convex-test` deployment: the import phase inserts every
 * staged row verbatim, swapping each surrogate reference for the real Convex id assigned at insert
 * (the exact relink the live import performs); reconcile and ledger ride the deployed PIPELINE-04
 * functions. An optional `corrupt` hook mutates the world AFTER import, modeling freeze-window
 * drift between the snapshot and the sweep.
 */
class ConvexTestWorld implements RehearsalWorld {
    private readonly t: Harness;
    private readonly corrupt?: (t: Harness) => Promise<void>;

    /**
     * @param t - The convex-test harness to import into.
     * @param corrupt - Optional post-import corruption hook (runs before the sweep).
     */
    constructor(t: Harness, corrupt?: (t: Harness) => Promise<void>) {
        this.t = t;
        this.corrupt = corrupt;
    }

    /** @inheritdoc */
    async importStaged(staged: StagedRehearsalDataset): Promise<void> {
        await this.t.run(async (ctx) => {
            const shopIds = new Map<string, Id<'shops'>>();
            for (const row of staged.core.shops) {
                shopIds.set(
                    row.payloadId,
                    await ctx.db.insert('shops', row.document as unknown as WithoutSystemFields<Doc<'shops'>>),
                );
            }
            const flagIds = new Map<string, Id<'featureFlags'>>();
            for (const row of staged.core.featureFlags) {
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
            for (const row of staged.core.shopCredentials) {
                const { shop, ...rest } = row.document;
                await ctx.db.insert('shopCredentials', {
                    ...(rest as Omit<WithoutSystemFields<Doc<'shopCredentials'>>, 'shop'>),
                    shop: realShop(shop),
                });
            }
            for (const row of staged.core.shopDomains) {
                await ctx.db.insert('shopDomains', {
                    domain: String(row.document.domain),
                    shop: realShop(row.document.shop),
                });
            }
            for (const row of staged.core.shopFeatureFlags) {
                const flag = flagIds.get(String(row.document.flag));
                if (!flag) throw new TypeError('unseeded flag surrogate');
                await ctx.db.insert('shopFeatureFlags', { shop: realShop(row.document.shop), flag });
            }
            for (const row of staged.core.reviews) {
                const { shopId, ...rest } = row.document;
                await ctx.db.insert('reviews', {
                    ...(rest as Omit<WithoutSystemFields<Doc<'reviews'>>, 'shopId'>),
                    shopId: realShop(shopId),
                });
            }
            for (const collection of staged.cms) {
                const parentIds = new Map<string, Id<'cmsDocuments'>>();
                for (const row of collection.cmsDocuments) {
                    const { shopId, ...rest } = row.document;
                    parentIds.set(
                        row.payloadId,
                        await ctx.db.insert('cmsDocuments', {
                            ...(rest as Omit<WithoutSystemFields<Doc<'cmsDocuments'>>, 'shopId'>),
                            shopId: realShop(shopId),
                        }),
                    );
                }
                for (const row of collection.cms_i18n) {
                    const { parentId: stagedParent, ...rest } = row.document;
                    const parentId = parentIds.get(String(stagedParent));
                    if (!parentId) throw new TypeError('unseeded cms parent surrogate');
                    await ctx.db.insert('cms_i18n', {
                        ...(rest as Omit<WithoutSystemFields<Doc<'cms_i18n'>>, 'parentId'>),
                        parentId,
                    });
                }
            }
        });
    }

    /** @inheritdoc */
    async reconcile(args: { runId: string; expected: CollectionChecksum[]; pageSize?: number }): Promise<{
        collections: number;
        mismatched: number;
    }> {
        if (this.corrupt) await this.corrupt(this.t);
        return (await this.t.action(runRef, args)) as { collections: number; mismatched: number };
    }

    /** @inheritdoc */
    async ledger(runId: string): Promise<RehearsalLedgerRow[]> {
        return this.t.run(async (ctx) => {
            const rows = await ctx.db
                .query('reconciliationLedger')
                .withIndex('by_run', (q) => q.eq('runId', runId))
                .collect();
            return rows
                .sort((left, right) => (left.collection < right.collection ? -1 : 1))
                .map((row) => ({
                    collection: row.collection,
                    status: row.status,
                    expectedCount: row.expectedCount,
                    actualCount: row.actualCount,
                }));
        });
    }
}

describe('CUTOVER-01 dress rehearsal — full pipeline against a convex-test world', () => {
    it('the multi-tenant rehearsal reaches dual-path checksum parity and reads GO', async () => {
        const world = new ConvexTestWorld(convexTest(schema, modules));
        const report = await runRehearsal(buildCorpus(), world, { runId: 'dress-rehearsal' });

        expect(report.verdict).toBe('GO');
        expect(report.divergences).toEqual([]);
        // 6 reconciled core tables (shopCollaborators is outside the checksum corpus by design)
        // plus cmsDocuments fanning out per slug (articles, pages, productMetadata).
        expect(report.summary).toEqual({ collections: 9, mismatched: 0 });
        expect(report.ledger.every((row) => row.status === 'match')).toBe(true);

        const rows = Object.fromEntries(report.rowCounts.map((entry) => [entry.table, entry.rows]));
        expect(rows).toMatchObject({
            shops: SHOP_COUNT,
            shopCredentials: SHOP_COUNT,
            shopDomains: SHOP_COUNT * 2,
            shopFeatureFlags: SHOP_COUNT * 2,
            featureFlags: FLAG_COUNT,
            reviews: SHOP_COUNT * REVIEWS_PER_SHOP,
            'cmsDocuments:articles': SHOP_COUNT * ARTICLES_PER_SHOP,
            'cms_i18n:articles': SHOP_COUNT * ARTICLES_PER_SHOP * 2,
            'cmsDocuments:pages': SHOP_COUNT * PAGES_PER_SHOP,
            // Pages rich text is block-embedded — converted inline, never shredded.
            'cms_i18n:pages': 0,
            'cmsDocuments:productMetadata': SHOP_COUNT * PRODUCT_METADATA_PER_SHOP,
            'cms_i18n:productMetadata': SHOP_COUNT * PRODUCT_METADATA_PER_SHOP * 2,
        });

        // The recorded rehearsal block for cutover-budgets.md — real output, captured verbatim.
        console.info(`\n${formatRehearsalReport(report)}`);
    }, 120_000);

    it('freeze-window drift after import flips the SAME rehearsal to NO-GO with a locatable ledger row', async () => {
        const world = new ConvexTestWorld(convexTest(schema, modules), async (t) => {
            // Drop one tenant's Swedish article side row — silent partial data loss.
            await t.run(async (ctx) => {
                const sideRows = await ctx.db.query('cms_i18n').collect();
                const victim = sideRows.find((row) => row.locale === 'sv-SE');
                if (!victim) throw new TypeError('expected a seeded sv-SE side row');
                await ctx.db.delete(victim._id);
            });
        });
        const report = await runRehearsal(buildCorpus(), world, { runId: 'dress-rehearsal-drift' });

        expect(report.verdict).toBe('NO-GO');
        expect(report.summary.mismatched).toBe(1);
        const drifted = report.ledger.filter((row) => row.status === 'mismatch');
        expect(drifted).toHaveLength(1);
        expect(drifted[0]?.collection).toMatch(/^cmsDocuments:/);
    }, 120_000);
});

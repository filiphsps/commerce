import { describe, expect, it } from 'vitest';

import { heading, lexicalDoc, paragraph } from '../../../packages/test-mongo/src/seed/fixtures/lexical';
import type { CollectionChecksum } from '../reconcile/checksum';
import type { Doc } from '../transform/id-remap';
import {
    countStagedRows,
    decideVerdict,
    formatRehearsalReport,
    type RehearsalLedgerRow,
    type RehearsalSource,
    type RehearsalWorld,
    runRehearsal,
    type StagedRehearsalDataset,
    stageRehearsal,
} from './run';

/** Stable source ObjectId hex strings so the staged surrogate graph is reproducible. */
const SHOP_A = '6630f1a2b3c4d5e6f7a8b9d1';
const SHOP_B = '6630f1a2b3c4d5e6f7a8b9d2';
const FLAG_ID = '6630f1a2b3c4d5e6f7a8b9e1';
const REVIEW_A = '6630f1a2b3c4d5e6f7a8b9f1';
const REVIEW_B = '6630f1a2b3c4d5e6f7a8b9f2';
const ARTICLE_ID = '6630f1a2b3c4d5e6f7a8b9c0';

/**
 * Builds one export-shaped shop document with an alternative domain (so `shopDomains` fans out to
 * two routing rows per shop).
 *
 * @param oid - The source ObjectId hex.
 * @param domain - The primary domain.
 * @returns The raw mongoexport-shaped shop.
 */
const shop = (oid: string, domain: string): Doc => ({
    _id: { $oid: oid },
    name: `Shop ${domain}`,
    domain,
    alternativeDomains: [`alt.${domain}`],
    design: {
        header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: domain } },
        accents: [],
    },
    commerceProvider: {
        type: 'shopify',
        authentication: { token: 'shpat_secret', publicToken: 'public', domain: `${domain}.myshopify.com` },
        storefrontId: 'gid://shopify/Shop/1',
        domain: `${domain}.myshopify.com`,
        id: domain,
    },
    featureFlags: [{ flag: { $oid: FLAG_ID } }],
    createdAt: { $date: '2024-04-30T00:00:00.000Z' },
    updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
});

/**
 * Builds the small but fully-shaped rehearsal corpus: two shops, one shared flag, two reviews, and
 * one localized rich-text article.
 *
 * @param body - The article's localized `body` bucket (override to poison the corpus).
 * @returns The export-shaped rehearsal source.
 */
const corpus = (
    body: unknown = {
        'en-US': lexicalDoc([heading('Hello', 'h1'), paragraph('World')]),
        'sv-SE': lexicalDoc([heading('Hej', 'h1'), paragraph('Världen')]),
    },
): RehearsalSource => ({
    core: {
        shops: [shop(SHOP_A, 'one.example.com'), shop(SHOP_B, 'two.example.com')],
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
        reviews: [REVIEW_A, REVIEW_B].map((oid) => ({
            _id: { $oid: oid },
            shop: { $oid: SHOP_A },
            createdAt: { $date: '2024-05-02T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-02T00:00:00.000Z' },
        })),
    },
    cms: {
        articles: [
            {
                _id: { $oid: ARTICLE_ID },
                tenant: { $oid: SHOP_A },
                title: { 'en-US': 'Title EN', 'sv-SE': 'Titel SV' },
                slug: 'hello-world',
                body,
                _status: 'published',
                createdAt: { $date: '2024-04-30T00:00:00.000Z' },
                updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
            },
        ],
    },
});

/**
 * An in-memory {@link RehearsalWorld} double recording call order. The green default reports every
 * expected collection as a match with agreeing counts; the knobs simulate the failure shapes the
 * verdict must catch.
 */
class FakeWorld implements RehearsalWorld {
    /** Call sequence, for the phase-ordering assertion. */
    readonly calls: string[] = [];
    /** The staged dataset captured by {@link importStaged}. */
    staged: StagedRehearsalDataset | null = null;
    /** When set, the reconcile summary reports this many mismatches. */
    mismatched = 0;
    /** When set, the ledger flips this collection's status to `mismatch`. */
    corruptCollection: string | null = null;
    /** When true, the ledger returns no rows despite a green summary. */
    dropLedger = false;

    private expected: CollectionChecksum[] = [];

    /** @inheritdoc */
    async importStaged(staged: StagedRehearsalDataset): Promise<void> {
        this.calls.push('import');
        this.staged = staged;
    }

    /** @inheritdoc */
    async reconcile(args: { runId: string; expected: CollectionChecksum[] }): Promise<{
        collections: number;
        mismatched: number;
    }> {
        this.calls.push('reconcile');
        this.expected = args.expected;
        return { collections: args.expected.length, mismatched: this.mismatched };
    }

    /** @inheritdoc */
    async ledger(): Promise<RehearsalLedgerRow[]> {
        this.calls.push('ledger');
        if (this.dropLedger) return [];
        return this.expected.map((entry) => ({
            collection: entry.collection,
            status: entry.collection === this.corruptCollection ? 'mismatch' : 'match',
            expectedCount: entry.count,
            actualCount: entry.count,
        }));
    }
}

describe('CUTOVER-01 rehearsal driver', () => {
    it('runs transform → checksums → import → reconcile in order and reads GO on a green world', async () => {
        const world = new FakeWorld();
        const report = await runRehearsal(corpus(), world, { runId: 'unit-green', pageSize: 4 });

        expect(world.calls).toEqual(['import', 'reconcile', 'ledger']);
        expect(report.verdict).toBe('GO');
        expect(report.runId).toBe('unit-green');
        expect(report.divergences).toEqual([]);
        expect(report.summary).toEqual({ collections: 7, mismatched: 0 });

        // Row counts mirror the PIPELINE-01 fan-out: 2 shops → 4 routing domains, 2 credential
        // rows, 2 flag joins; plus the shredded article (2 side rows: the rich `body` × 2 locales —
        // `title` is localized but not a registered rich field, so it stays inline).
        const rows = Object.fromEntries(report.rowCounts.map((entry) => [entry.table, entry.rows]));
        expect(rows).toMatchObject({
            shops: 2,
            shopCredentials: 2,
            shopDomains: 4,
            shopFeatureFlags: 2,
            featureFlags: 1,
            reviews: 2,
            'cmsDocuments:articles': 1,
            'cms_i18n:articles': 2,
        });
        const collaborators = report.rowCounts.find((entry) => entry.table === 'shopCollaborators');
        expect(collaborators?.reconciled).toBe(false);
        const sideRows = report.rowCounts.find((entry) => entry.table === 'cms_i18n:articles');
        expect(sideRows?.reconciled).toBe(false);

        for (const phase of Object.values(report.timings)) {
            expect(phase).toBeGreaterThanOrEqual(0);
            expect(report.timings.totalMs).toBeGreaterThanOrEqual(phase * 0.99);
        }
    });

    it('reads NO-GO when the reconcile summary reports a mismatch', async () => {
        const world = new FakeWorld();
        world.mismatched = 1;
        const report = await runRehearsal(corpus(), world, { runId: 'unit-mismatch' });
        expect(report.verdict).toBe('NO-GO');
    });

    it('reads NO-GO when the ledger disagrees with a green summary (either direction)', async () => {
        const corrupt = new FakeWorld();
        corrupt.corruptCollection = 'cmsDocuments:articles';
        expect((await runRehearsal(corpus(), corrupt, { runId: 'unit-ledger-corrupt' })).verdict).toBe('NO-GO');

        const empty = new FakeWorld();
        empty.dropLedger = true;
        expect((await runRehearsal(corpus(), empty, { runId: 'unit-ledger-empty' })).verdict).toBe('NO-GO');
    });

    it('reads NO-GO when the transform quarantines an unconvertible rich-text value', async () => {
        const world = new FakeWorld();
        const poisoned = corpus({ 'en-US': lexicalDoc([{ type: 'video', src: 'https://cdn/x.mp4', version: 1 }]) });
        const report = await runRehearsal(poisoned, world, { runId: 'unit-quarantine' });

        expect(report.divergences).toHaveLength(1);
        expect(report.divergences[0]).toMatchObject({ collection: 'articles', fieldPath: 'body', locale: 'en-US' });
        expect(report.verdict).toBe('NO-GO');
        // The quarantine is reported, never silently dropped from the rendering.
        expect(formatRehearsalReport(report)).toContain('Quarantined values');
    });

    it('decideVerdict refuses a count drift even when every status reads match', () => {
        const ledger: RehearsalLedgerRow[] = [
            { collection: 'shops', status: 'match', expectedCount: 2, actualCount: 1 },
        ];
        expect(decideVerdict([], { collections: 1, mismatched: 0 }, ledger)).toBe('NO-GO');
    });

    it('renders the markdown report with the verdict, row counts, and the parity ledger', async () => {
        const world = new FakeWorld();
        const report = await runRehearsal(corpus(), world, { runId: 'unit-render' });
        const markdown = formatRehearsalReport(report);

        expect(markdown).toContain('`unit-render` — **GO**');
        expect(markdown).toContain('| `shops` | 2 | yes |');
        expect(markdown).toContain('| `cms_i18n:articles` | 2 | no — see driver JSDoc |');
        expect(markdown).toContain('| `cmsDocuments:articles` | match | 1 | 1 |');
        expect(markdown).toMatch(/Phases: transform \d+ ms/);
    });

    it('stageRehearsal/countStagedRows stay pure and cover a core-only corpus', () => {
        const { staged, divergences } = stageRehearsal({ core: corpus().core });
        expect(divergences).toEqual([]);
        expect(staged.cms).toEqual([]);
        const counts = countStagedRows(staged);
        expect(counts.find((entry) => entry.table === 'shops')?.rows).toBe(2);
        expect(counts.some((entry) => entry.table.startsWith('cmsDocuments:'))).toBe(false);
    });
});

import { describe, expect, it } from 'vitest';

import {
    canonicalJson,
    checksumDocument,
    rollupChecksum,
    sha256Hex,
} from '../../../packages/convex/convex/lib/checksum';
import { heading, lexicalDoc, paragraph } from '../fixtures/lexical';
import type { Doc, SourceDataset } from '../transform/index';
import { expectedChecksums } from './checksum';

/** Stable source ObjectId hex strings so every derivation is reproducible. */
const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9d1';
const FLAG_ID = '6630f1a2b3c4d5e6f7a8b9e1';
const REVIEW_ID = '6630f1a2b3c4d5e6f7a8b9f1';
const ARTICLE_ID = '6630f1a2b3c4d5e6f7a8b9c0';

/** A minimal but representative source dataset covering every core corpus collection. */
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

/**
 * Builds a localized source article whose `body` shreds into per-locale `cms_i18n` side rows.
 *
 * @param slug - The article slug, varied to produce a divergent sibling document.
 * @returns The raw mongoexport-shaped article.
 */
const makeArticle = (slug: string): Doc => ({
    _id: { $oid: ARTICLE_ID },
    tenant: { $oid: SHOP_ID },
    title: { 'en-US': 'Title EN', 'sv-SE': 'Titel SV' },
    slug,
    body: {
        'en-US': lexicalDoc([heading('Hello', 'h1'), paragraph('World')]),
        'sv-SE': lexicalDoc([heading('Hej', 'h1'), paragraph('Världen')]),
    },
    _status: 'published',
    createdAt: { $date: '2024-04-30T00:00:00.000Z' },
    updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
});

/** The articles corpus for the happy-path expectations. */
const articles: Doc[] = [makeArticle('hello-world')];

describe('canonicalization (the cross-side byte contract)', () => {
    it('is invariant under object key order, at every depth', () => {
        const a = { outer: { b: 2, a: 1 }, list: [{ y: true, x: false }] };
        const b = { list: [{ x: false, y: true }], outer: { a: 1, b: 2 } };
        expect(canonicalJson(a)).toBe(canonicalJson(b));
    });

    it('drops undefined object entries so absent and omitted optionals canonicalize identically', () => {
        expect(canonicalJson({ a: 1, b: undefined })).toBe(canonicalJson({ a: 1 }));
    });

    it('normalizes -0 to 0 and keeps NaN distinct from null', () => {
        expect(canonicalJson({ n: -0 })).toBe(canonicalJson({ n: 0 }));
        expect(canonicalJson({ n: Number.NaN })).not.toBe(canonicalJson({ n: null }));
    });

    it('preserves array element order as content', () => {
        expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
    });

    it('sha256Hex matches the published SHA-256 test vector', async () => {
        await expect(sha256Hex('abc')).resolves.toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        );
    });

    it('rollup is order-invariant over the per-document hash list', async () => {
        const hashes = [await sha256Hex('one'), await sha256Hex('two')];
        await expect(rollupChecksum(hashes)).resolves.toBe(await rollupChecksum([...hashes].reverse()));
    });
});

describe('expectedChecksums (full-set, transform-reusing expected side)', () => {
    it('covers every core corpus collection plus each supplied CMS collection', async () => {
        const results = await expectedChecksums(source, { articles });
        expect(results.map((entry) => entry.collection)).toEqual([
            'cmsDocuments:articles',
            'featureFlags',
            'reviews',
            'shopCredentials',
            'shopDomains',
            'shopFeatureFlags',
            'shops',
        ]);
    });

    it('checksums the FULL document set — one hash per document, never a sample', async () => {
        const results = await expectedChecksums(source, { articles });
        for (const entry of results) {
            expect(entry.docHashes).toHaveLength(entry.count);
        }
        const domains = results.find((entry) => entry.collection === 'shopDomains');
        expect(domains?.count).toBe(2);
    });

    it('is deterministic and invariant under source document order', async () => {
        const first = await expectedChecksums(source, { articles });
        const second = await expectedChecksums(
            {
                ...source,
                shops: [...(source.shops ?? [])].reverse(),
                reviews: [...(source.reviews ?? [])].reverse(),
            },
            { articles: [...articles].reverse() },
        );
        expect(second).toEqual(first);
    });

    it('maps id references to stable identities, never staged surrogate ids', async () => {
        const results = await expectedChecksums(source, {});
        const reviews = results.find((entry) => entry.collection === 'reviews');
        // Recompute the review hash with the PUBLIC shop id substituted: identical means the
        // checksum corpus carries `legacyId`-mapped references, not volatile surrogate/Convex ids.
        const manual = await checksumDocument({
            shopId: SHOP_ID,
            createdAt: Date.parse('2024-05-02T00:00:00.000Z'),
            updatedAt: Date.parse('2024-05-02T00:00:00.000Z'),
        });
        expect(reviews?.docHashes).toEqual([manual]);
    });

    it('a divergent document changes exactly one per-document hash (locatable, Merkle-ish)', async () => {
        const clean = await expectedChecksums(source, { articles });
        const mutated = await expectedChecksums(source, { articles: [makeArticle('tampered')] });
        const cleanArticles = clean.find((entry) => entry.collection === 'cmsDocuments:articles');
        const mutatedArticles = mutated.find((entry) => entry.collection === 'cmsDocuments:articles');
        expect(mutatedArticles?.rollup).not.toBe(cleanArticles?.rollup);
        expect(mutatedArticles?.docHashes).toHaveLength(1);
        expect(mutatedArticles?.docHashes).not.toEqual(cleanArticles?.docHashes);
        const cleanCore = clean.filter((entry) => entry.collection !== 'cmsDocuments:articles');
        const mutatedCore = mutated.filter((entry) => entry.collection !== 'cmsDocuments:articles');
        expect(mutatedCore).toEqual(cleanCore);
    });
});

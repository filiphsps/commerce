import { describe, expect, it } from 'vitest';

import type { Doc } from '../transform/id-remap';
import { type SourceDataset, transform } from '../transform/index';
import { invertSnapshot, snapshotFromStaged } from './invert';
import { compareSources, formatRoundTripReport, roundTrip } from './round-trip';

/** Tenant scale of the canonical round-trip corpus (mirrors the CUTOVER-01 rehearsal core). */
const SHOP_COUNT = 24;
/** Platform feature flags; each shop references two. */
const FLAG_COUNT = 8;
/** Reviews per shop. */
const REVIEWS_PER_SHOP = 4;

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
 * Builds the canonical multi-tenant core corpus: the CUTOVER-01 rehearsal scale (24 tenants, 8
 * flags, 96 reviews, alternate domains, two flag refs per shop) plus the edge shapes the rehearsal
 * corpus does not exercise — a non-Shopify provider, a shop without a provider, and a shop without
 * alternate domains — so the round trip covers every forward-transform branch for the core tables.
 *
 * @returns The corpus as a raw mongoexport-shaped source dataset.
 */
function buildCorpus(): SourceDataset {
    const featureFlags: Doc[] = Array.from({ length: FLAG_COUNT }, (...[, index]) => ({
        _id: { $oid: oid(0xe1, index) },
        key: `flag-${index}`,
        defaultValue: index % 2 === 0,
        targeting: [],
        createdAt: date('2024-04-30T00:00:00.000Z'),
        updatedAt: date('2024-04-30T00:00:00.000Z'),
    }));

    const shops: Doc[] = [];
    const reviews: Doc[] = [];
    for (let s = 0; s < SHOP_COUNT; s += 1) {
        const shopOid = oid(0xd1, s);
        const domain = `tenant-${s}.example.com`;
        const shop: Doc = {
            _id: { $oid: shopOid },
            name: `Tenant ${s}`,
            domain,
            design: {
                header: { logo: { width: 512, height: 512, src: `https://cdn/${s}.png`, alt: `Tenant ${s}` } },
                accents: [],
            },
            featureFlags: [
                { flag: { $oid: oid(0xe1, s % FLAG_COUNT) } },
                { flag: { $oid: oid(0xe1, (s + 3) % FLAG_COUNT) } },
            ],
            createdAt: date('2024-04-30T00:00:00.000Z'),
            updatedAt: date('2024-05-01T00:00:00.000Z'),
        };
        if (s % 5 !== 0) shop.alternativeDomains = [`alt.${domain}`];
        if (s % 7 === 1) {
            shop.commerceProvider = { type: 'dummy', id: `dummy-${s}` };
        } else if (s % 7 !== 0) {
            shop.commerceProvider = {
                type: 'shopify',
                authentication: {
                    token: `shpat_secret_${s}`,
                    publicToken: `public_${s}`,
                    domain: `tenant-${s}.myshopify.com`,
                    customers: { id: `cust-${s}`, clientId: `client-${s}`, clientSecret: `sealed-${s}` },
                },
                storefrontId: `gid://shopify/Shop/${s + 1}`,
                domain: `tenant-${s}.myshopify.com`,
                id: `tenant-${s}`,
            };
        }
        shops.push(shop);

        for (let r = 0; r < REVIEWS_PER_SHOP; r += 1) {
            reviews.push({
                _id: { $oid: oid(0xf1, s * REVIEWS_PER_SHOP + r) },
                shop: { $oid: shopOid },
                createdAt: date('2024-05-02T00:00:00.000Z'),
                updatedAt: date('2024-05-02T00:00:00.000Z'),
            });
        }
    }

    return { shops, featureFlags, reviews };
}

/** The corpus reversed through the real forward transform + inversion, for tamper tests. */
function reverseCorpus(source: SourceDataset): SourceDataset {
    const { collections, divergences } = invertSnapshot(snapshotFromStaged(transform(source)));
    expect(divergences).toEqual([]);
    return { shops: collections.shops, featureFlags: collections.featureFlags, reviews: collections.reviews };
}

describe('roundTrip — canonical corpus parity (the G2 reverse-ETL gate)', () => {
    it('reaches full per-collection checksum parity against the original', async () => {
        const report = await roundTrip(buildCorpus());
        expect(report.reverseDivergences).toEqual([]);
        expect(report.collections.map((entry) => entry.collection)).toEqual([
            'featureFlags',
            'reviews',
            'shopCredentials',
            'shopDomains',
            'shopFeatureFlags',
            'shops',
        ]);
        for (const entry of report.collections) {
            expect(entry.status).toBe('match');
            expect(entry.actualRollup).toBe(entry.expectedRollup);
            expect(entry.actualCount).toBe(entry.expectedCount);
            expect(entry.missingDocs).toBe(0);
            expect(entry.unexpectedDocs).toBe(0);
        }
        // FULL-set parity, never a sample: every corpus document is hashed and compared.
        expect(report.documents).toBeGreaterThanOrEqual(SHOP_COUNT * (2 + REVIEWS_PER_SHOP) + FLAG_COUNT);
        expect(report.ok).toBe(true);
    });

    it('is deterministic across runs', async () => {
        const first = await roundTrip(buildCorpus());
        const second = await roundTrip(buildCorpus());
        expect(second).toEqual(first);
    });
});

describe('compareSources — injected-bug detection', () => {
    it('localizes a mutated restored field to exactly its collection, ok=false', async () => {
        const source = buildCorpus();
        const reversed = reverseCorpus(source);
        const shops = (reversed.shops ?? []).map((doc, index) => (index === 0 ? { ...doc, name: 'tampered' } : doc));
        const report = await compareSources(source, { ...reversed, shops }, []);
        expect(report.ok).toBe(false);
        const broken = report.collections.filter((entry) => entry.status === 'mismatch');
        expect(broken.map((entry) => entry.collection)).toEqual(['shops']);
        expect(broken[0]?.missingDocs).toBe(1);
        expect(broken[0]?.unexpectedDocs).toBe(1);
    });

    it('catches a dropped credential secret as a shopCredentials divergence', async () => {
        const source = buildCorpus();
        const snapshot = snapshotFromStaged(transform(source));
        const shopCredentials = (snapshot.shopCredentials ?? []).map((row) => {
            if (typeof row.token !== 'string') return row;
            const { token, ...rest } = row;
            return rest;
        });
        const { collections, divergences } = invertSnapshot({ ...snapshot, shopCredentials });
        expect(divergences).toEqual([]);
        const report = await compareSources(
            source,
            { shops: collections.shops, featureFlags: collections.featureFlags, reviews: collections.reviews },
            divergences,
        );
        expect(report.ok).toBe(false);
        const broken = report.collections.filter((entry) => entry.status === 'mismatch');
        expect(broken.map((entry) => entry.collection)).toEqual(['shopCredentials']);
    });

    it('fails the gate on any reverse divergence even when checksums agree', async () => {
        const source = buildCorpus();
        const report = await compareSources(source, reverseCorpus(source), [
            { table: 'reviews', id: 'r1', reason: 'unresolved-shop-reference' },
        ]);
        expect(report.ok).toBe(false);
        expect(report.collections.every((entry) => entry.status === 'match')).toBe(true);
    });
});

describe('formatRoundTripReport', () => {
    it('renders the verdict, every collection row, and the divergence list', async () => {
        const source = buildCorpus();
        const green = formatRoundTripReport(await roundTrip(source));
        expect(green).toContain('Round-trip parity: GREEN');
        expect(green).toContain('shopCredentials');

        const red = formatRoundTripReport(
            await compareSources(source, reverseCorpus(source), [
                { table: 'sessions', id: 's1', reason: 'unresolved-user-reference' },
            ]),
        );
        expect(red).toContain('Round-trip parity: RED');
        expect(red).toContain('- sessions/s1: unresolved-user-reference');
    });
});

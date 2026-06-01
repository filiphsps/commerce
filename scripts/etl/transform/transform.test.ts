import { describe, expect, it } from 'vitest';

import { coerceObjectId, deriveId, remapObjectId } from './id-remap';
import { normalizeExtendedJson, type SourceDataset, transform } from './index';

/** Stable source `ObjectId`s used across the golden fixture so the surrogate derivation is checkable. */
const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9c0';
const USER_ID = '6630f1a2b3c4d5e6f7a8b9d1';
const FLAG_ID = '6630f1a2b3c4d5e6f7a8b9e2';
const REVIEW_ID = '6630f1a2b3c4d5e6f7a8b9f3';

/** The referenced global feature flag, in mongoexport extended-JSON form. */
const goldenFlag = {
    _id: { $oid: FLAG_ID },
    key: 'checkout.express',
    kind: 'behavior',
    defaultValue: false,
    targeting: [],
    createdAt: { $date: '2024-04-30T00:00:00.000Z' },
    updatedAt: { $date: '2024-04-30T00:00:00.000Z' },
};

/**
 * Golden input: one shop (with masked credentials, a primary domain duplicated inside
 * `alternativeDomains`, a collaborator, and a feature-flag ref), the referenced global feature flag,
 * and a review — all in mongoexport extended-JSON form (`$oid`/`$date`).
 */
const goldenInput: SourceDataset = {
    shops: [
        {
            _id: { $oid: SHOP_ID },
            name: 'Nordcom Demo',
            domain: 'nordcom-demo-shop.com',
            // The primary domain is repeated here to prove de-duplication.
            alternativeDomains: ['www.nordcom-demo-shop.com', 'nordcom-demo-shop.com'],
            i18n: { defaultLocale: 'en-US' },
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Logo' } },
                accents: [{ type: 'primary', color: '#000000', foreground: '#ffffff' }],
            },
            commerceProvider: {
                type: 'shopify',
                authentication: {
                    token: 'shpat_SECRET',
                    publicToken: 'pub_TOKEN',
                    domain: 'demo.myshopify.com',
                    customers: { id: 'cust-1', clientId: 'client-1', clientSecret: 'SECRET_CS' },
                },
                storefrontId: 'sf-1',
                domain: 'demo.myshopify.com',
                id: 'gid://shopify/Shop/1',
            },
            collaborators: [{ user: USER_ID, permissions: ['admin'] }],
            featureFlags: [{ flag: { $oid: FLAG_ID } }],
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
            __v: 0,
        },
    ],
    featureFlags: [goldenFlag],
    reviews: [
        {
            _id: { $oid: REVIEW_ID },
            shop: SHOP_ID,
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-04-30T00:00:00.000Z' },
        },
    ],
};

describe('normalizeExtendedJson', () => {
    it('resolves $oid to its hex string', () => {
        expect(normalizeExtendedJson({ $oid: SHOP_ID })).toBe(SHOP_ID);
    });

    it('resolves $date to epoch-ms', () => {
        expect(normalizeExtendedJson({ $date: '2024-04-30T00:00:00.000Z' })).toBe(Date.parse('2024-04-30T00:00:00.000Z'));
    });

    it('resolves $numberLong/$numberInt to a number', () => {
        expect(normalizeExtendedJson({ $numberLong: '42' })).toBe(42);
        expect(normalizeExtendedJson({ $numberInt: '7' })).toBe(7);
    });

    it('recurses into arrays and nested objects without mutating the input', () => {
        const input = { a: [{ $oid: SHOP_ID }], b: { c: { $numberInt: '1' } } };
        const before = JSON.stringify(input);
        expect(normalizeExtendedJson(input)).toEqual({ a: [SHOP_ID], b: { c: 1 } });
        expect(JSON.stringify(input)).toBe(before);
    });
});

describe('id-remap determinism', () => {
    it('derives the same surrogate id for the same (table, ObjectId)', () => {
        expect(remapObjectId('shops', SHOP_ID)).toBe(remapObjectId('shops', SHOP_ID));
    });

    it('namespaces the id by table so the same ObjectId differs across tables', () => {
        expect(remapObjectId('shops', SHOP_ID)).not.toBe(remapObjectId('reviews', SHOP_ID));
    });

    it('emits a 32-symbol id over the Convex alphabet', () => {
        expect(remapObjectId('shops', SHOP_ID)).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{32}$/);
    });

    it('keeps deriveId stable and separator-unambiguous', () => {
        expect(deriveId('shopDomains', 'a', 'b')).toBe(deriveId('shopDomains', 'a', 'b'));
        expect(deriveId('shopDomains', 'a', 'b')).not.toBe(deriveId('shopDomains', 'ab'));
    });

    it('coerces every Mongo id encoding to a hex string', () => {
        expect(coerceObjectId({ $oid: SHOP_ID })).toBe(SHOP_ID);
        expect(coerceObjectId({ toHexString: () => SHOP_ID })).toBe(SHOP_ID);
        expect(coerceObjectId(SHOP_ID)).toBe(SHOP_ID);
        expect(coerceObjectId({})).toBeNull();
    });
});

describe('transform — golden output', () => {
    it('matches the golden snapshot', () => {
        expect(transform(goldenInput)).toMatchSnapshot();
    });
});

describe('acceptance #2 — every shop carries legacyId, and shop.id resolves to legacyId not the surrogate', () => {
    const result = transform(goldenInput);

    it('preserves the source ObjectId as legacyId, distinct from the surrogate payloadId', () => {
        const shop = result.shops[0];
        expect(shop).toBeDefined();
        expect(shop?.document.legacyId).toBe(SHOP_ID);
        expect(shop?.payloadId).toBe(remapObjectId('shops', SHOP_ID));
        expect(shop?.payloadId).not.toBe(SHOP_ID);
    });

    it('shreds the masked credentials off the shop row into shopCredentials', () => {
        const shop = result.shops[0];
        const provider = shop?.document.commerceProvider as { authentication: { token?: unknown; publicToken?: unknown; customers?: { clientSecret?: unknown; id?: unknown } } };
        expect(provider.authentication.token).toBeUndefined();
        expect(provider.authentication.customers?.clientSecret).toBeUndefined();
        expect(provider.authentication.publicToken).toBe('pub_TOKEN');
        expect(provider.authentication.customers?.id).toBe('cust-1');

        const credentials = result.shopCredentials[0];
        expect(credentials?.document).toEqual({ shop: shop?.payloadId, token: 'shpat_SECRET', clientSecret: 'SECRET_CS' });
    });

    it('feature-flag join refs resolve to the global flag row payloadId', () => {
        const join = result.shopFeatureFlags[0];
        const flag = result.featureFlags[0];
        expect(flag?.document.legacyId).toBe(FLAG_ID);
        expect(join?.document.flag).toBe(flag?.payloadId);
        expect(join?.document.flag).toBe(remapObjectId('featureFlags', FLAG_ID));
    });

    it('review shopId resolves to the shop row payloadId (not the embedded snapshot)', () => {
        const review = result.reviews[0];
        const shop = result.shops[0];
        expect(review?.document.shopId).toBe(shop?.payloadId);
        expect(review?.document.createdAt).toBe(Date.parse('2024-04-30T00:00:00.000Z'));
    });
});

describe('acceptance #3 — alternativeDomains normalize to one shopDomains row per (domain -> shopId)', () => {
    const result = transform(goldenInput);

    it('emits one de-duplicated row per domain, all referencing the shop payloadId', () => {
        const shop = result.shops[0];
        const domains = result.shopDomains.map((row) => row.document.domain);
        // primary + alternativeDomains, with the repeated primary collapsed to one row.
        expect(new Set(domains)).toEqual(new Set(['nordcom-demo-shop.com', 'www.nordcom-demo-shop.com']));
        expect(result.shopDomains).toHaveLength(2);
        for (const row of result.shopDomains) expect(row.document.shop).toBe(shop?.payloadId);
    });

    it('derives each shopDomains payloadId deterministically from (shopId, domain)', () => {
        const shop = result.shops[0];
        for (const row of result.shopDomains) {
            expect(row.payloadId).toBe(deriveId('shopDomains', String(shop?.payloadId), String(row.document.domain)));
        }
    });

    it('de-embeds the collaborator into a join row with a surrogate user ref', () => {
        const shop = result.shops[0];
        const collaborator = result.shopCollaborators[0];
        expect(collaborator?.document).toEqual({ shop: shop?.payloadId, user: remapObjectId('users', USER_ID), permissions: ['admin'] });
    });
});

describe('acceptance #1 — idempotency: pure function, byte-identical re-run', () => {
    it('does not mutate the input (purity)', () => {
        const snapshot = structuredClone(goldenInput);
        transform(goldenInput);
        expect(goldenInput).toEqual(snapshot);
    });

    it('produces a byte-identical dataset on a second run (same input -> same output)', () => {
        expect(JSON.stringify(transform(goldenInput))).toBe(JSON.stringify(transform(goldenInput)));
    });

    it('is order-insensitive: reversing the source rows yields the same dataset', () => {
        const flagB = { _id: { $oid: '6630f1a2b3c4d5e6f7a8aaaa' }, key: 'b.flag', defaultValue: true, targeting: [] };
        const forward: SourceDataset = { featureFlags: [goldenFlag, flagB] };
        const reversed: SourceDataset = { featureFlags: [flagB, goldenFlag] };
        expect(JSON.stringify(transform(forward))).toBe(JSON.stringify(transform(reversed)));
    });

    it('skips a shop with no resolvable id rather than throwing', () => {
        expect(transform({ shops: [{ name: 'no id' }] }).shops).toHaveLength(0);
    });
});

import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { validate } from 'convex-helpers/validators';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { systemMutation, systemQuery } from '../_constructors';
import schema from '../schema';
import {
    featureFlagValidator,
    shopCollaboratorValidator,
    shopCredentialsValidator,
    shopDomainValidator,
    shopFeatureFlagValidator,
    shopValidator,
} from './shops';

/**
 * Unified `ShopBase` fixture: a fully-configured Shopify shop carrying the post-Phase-0 collapsed
 * shape — `legacyId` (the projected `shop.id`), the required `design` surface, and a `commerceProvider`
 * whose masked `token`/`clientSecret` are ABSENT (shredded into `shopCredentials`). It exercises the
 * required leaves plus the optional `i18n`/`commerce`/`icons`/`integrations`/`thirdParty` groups.
 */
const fullShop = {
    legacyId: '6630f1a2b3c4d5e6f7a8b9c0',
    name: 'Acme',
    description: 'Acme storefront',
    domain: 'acme.com',
    alternativeDomains: ['www.acme.com', 'acme.myshopify.com'],
    i18n: { defaultLocale: 'en-US' },
    commerce: { maxQuantity: 199_999, processingTimeInDays: 5 },
    showProductVendor: false,
    design: {
        header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Acme' } },
        accents: [
            { type: 'primary', color: '#073b4c', foreground: '#ffffff' },
            { type: 'secondary', color: '#ef476f', foreground: '#ffffff' },
        ],
    },
    icons: { favicon: { width: 512, height: 512, src: 'https://cdn/favicon.png', alt: 'Acme' } },
    commerceProvider: {
        type: 'shopify',
        authentication: {
            publicToken: 'public-token',
            domain: 'acme.myshopify.com',
            customers: { id: 'cust-id', clientId: 'client-id' },
        },
        storefrontId: 'sf-id',
        domain: 'acme.myshopify.com',
        id: 'provider-id',
    },
    integrations: { judgeme: { publicToken: 'judgeme-public' } },
    thirdParty: { googleTagManager: 'GTM-XXXX', intercom: 'intercom-id' },
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
};

describe('shopValidator', () => {
    it('validates a unified ShopBase fixture', () => {
        expect(validate(shopValidator, fullShop)).toBe(true);
    });

    it('validates a minimal shop with every optional group absent', () => {
        const minimal = {
            legacyId: fullShop.legacyId,
            name: fullShop.name,
            domain: fullShop.domain,
            design: fullShop.design,
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: fullShop.createdAt,
            updatedAt: fullShop.updatedAt,
        };
        expect(validate(shopValidator, minimal)).toBe(true);
    });

    it('accepts a deep-partial authored theme override', () => {
        const themed = {
            ...fullShop,
            theme: {
                colors: { background: '#0b0b0b', foreground: '#fafafa' },
                productCard: { ctaBg: '#14110b', titleWeight: 600 },
            },
        };
        expect(validate(shopValidator, themed)).toBe(true);
    });

    it('accepts a per-surface product-card extension manifest', () => {
        const withExtensions = {
            ...fullShop,
            extensions: { productCard: { collection: { ctaPlacement: 'inline-button', layout: 'vertical' } } },
        };
        expect(validate(shopValidator, withExtensions)).toBe(true);
    });

    it('accepts a full extension manifest across every section', () => {
        const withExtensions = {
            ...fullShop,
            extensions: {
                theme: { colors: { background: '#0b0b0b' } },
                chrome: { order: ['header', 'content', 'footer'] },
                sections: { 'info-bar': false },
                blocks: { available: ['banner', 'rich-text'] },
                productCard: { search: { layout: 'horizontal' } },
                blockDefaults: { collection: { defaultLayout: 'grid' } },
            },
        };
        expect(validate(shopValidator, withExtensions)).toBe(true);
    });

    it('rejects an unknown key inside a product-card variant selection', () => {
        const leaky = { ...fullShop, extensions: { productCard: { collection: { bogus: 'x' } } } };
        expect(validate(shopValidator, leaky)).toBe(false);
    });

    it('rejects a masked private token on the shop row (it lives in shopCredentials)', () => {
        const leaky = {
            ...fullShop,
            commerceProvider: {
                ...fullShop.commerceProvider,
                authentication: { ...fullShop.commerceProvider.authentication, token: 'secret' },
            },
        };
        expect(validate(shopValidator, leaky)).toBe(false);
    });

    it('rejects a masked customers.clientSecret on the shop row (it lives in shopCredentials)', () => {
        const leaky = {
            ...fullShop,
            commerceProvider: {
                ...fullShop.commerceProvider,
                authentication: {
                    ...fullShop.commerceProvider.authentication,
                    customers: { id: 'cust-id', clientId: 'client-id', clientSecret: 'secret' },
                },
            },
        };
        expect(validate(shopValidator, leaky)).toBe(false);
    });

    it('rejects an unknown top-level key', () => {
        expect(validate(shopValidator, { ...fullShop, collaborators: [] })).toBe(false);
    });
});

describe('shop-family side tables', () => {
    it('validates split-out credentials carrying the two shredded secrets', () => {
        expect(validate(shopCredentialsValidator, { shop: 'shop-id', token: 'secret', clientSecret: 'secret' })).toBe(
            true,
        );
        expect(validate(shopCredentialsValidator, { shop: 'shop-id' })).toBe(true);
    });

    it('validates a domain → shop routing row', () => {
        expect(validate(shopDomainValidator, { shop: 'shop-id', domain: 'acme.com' })).toBe(true);
    });

    it('validates a collaborator join row', () => {
        expect(validate(shopCollaboratorValidator, { shop: 'shop-id', user: 'user-id', permissions: ['admin'] })).toBe(
            true,
        );
    });

    it('validates a feature-flag join row', () => {
        expect(validate(shopFeatureFlagValidator, { shop: 'shop-id', flag: 'flag-id' })).toBe(true);
    });
});

describe('featureFlagValidator', () => {
    it('validates a global feature-flag fixture', () => {
        const flag = {
            legacyId: '6630f1a2b3c4d5e6f7a8b9c1',
            key: 'checkout.express',
            kind: 'behavior',
            description: 'Express checkout',
            defaultValue: false,
            options: [
                { label: 'On', value: true },
                { label: 'Off', value: false },
            ],
            targeting: [{ rule: 'shopDomain', params: { domain: 'acme.com' }, value: true }],
            createdAt: 1_700_000_000_000,
            updatedAt: 1_700_000_100_000,
        };
        expect(validate(featureFlagValidator, flag)).toBe(true);
    });

    it('validates a feature flag with the optional kind/options/description absent', () => {
        const flag = {
            legacyId: '6630f1a2b3c4d5e6f7a8b9c2',
            key: 'minimal',
            defaultValue: true,
            targeting: [],
            createdAt: 1_700_000_000_000,
            updatedAt: 1_700_000_100_000,
        };
        expect(validate(featureFlagValidator, flag)).toBe(true);
    });
});

/**
 * A fixed epoch-ms timestamp used wherever `createdAt`/`updatedAt` are required. The exact
 * value is irrelevant; it only satisfies the required numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Minimal `shops` row: only the required leaves are present. The optional groups
 * (`i18n`, `commerce`, `icons`, `integrations`, `thirdParty`, `alternativeDomains`,
 * `description`, `showProductVendor`, `theme`, `extensions`) are all absent so the fixture
 * stays as slim as possible while still satisfying `shopValidator`.
 */
const insertShop = systemMutation({
    args: { clerkOrgId: v.optional(v.string()) },
    handler: async (ctx, { clerkOrgId }) =>
        ctx.db.insert('shops', {
            legacyId: 'aabbccddee1122334455aabb',
            name: 'Test Shop',
            domain: 'test.example.com',
            design: {
                header: { logo: { width: 64, height: 64, src: 'https://cdn/logo.png', alt: 'Test' } },
                accents: [{ type: 'primary', color: '#000000', foreground: '#ffffff' }],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
            clerkOrgId,
        }),
});

/**
 * Queries `shops` via the `by_clerk_org` index and returns the `clerkOrgId` of the first
 * matching row, or `null` if no row matches.
 */
const findShopByClerkOrg = systemQuery({
    args: { clerkOrgId: v.string() },
    handler: async (ctx, { clerkOrgId }) => {
        const row = await ctx.db
            .query('shops')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
            .first();
        if (row === null) return null;
        return row.clerkOrgId ?? null;
    },
});

/**
 * Hand-built module map for `convex-test`. The `_generated/server.js` key is required so
 * `convex-test`'s module-root detection can derive the shared `/convex/` prefix. The fixtures
 * are mapped to this module's path so they resolve by `FunctionReference`.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/tables/shops.test.ts': () =>
        Promise.resolve({
            insertShop,
            findShopByClerkOrg,
        }),
};

const insertShopRef = makeFunctionReference<'mutation'>('tables/shops.test:insertShop');
const findShopByClerkOrgRef = makeFunctionReference<'query'>('tables/shops.test:findShopByClerkOrg');

describe('shops.clerkOrgId + by_clerk_org index', () => {
    it('inserts a shop with clerkOrgId and resolves it via the by_clerk_org index', async () => {
        const t = convexTest(schema, modules);

        await t.mutation(insertShopRef, { clerkOrgId: 'org_1' });

        const found = await t.query(findShopByClerkOrgRef, { clerkOrgId: 'org_1' });

        expect(found).toBe('org_1');
    });

    it('returns null from by_clerk_org when no shop carries that clerkOrgId', async () => {
        const t = convexTest(schema, modules);

        const found = await t.query(findShopByClerkOrgRef, { clerkOrgId: 'org_missing' });

        expect(found).toBeNull();
    });

    it('accepts a shop row where clerkOrgId is absent (existing rows without an owner)', async () => {
        const t = convexTest(schema, modules);

        await t.mutation(insertShopRef, {});

        const found = await t.query(findShopByClerkOrgRef, { clerkOrgId: 'org_1' });

        expect(found).toBeNull();
    });
});

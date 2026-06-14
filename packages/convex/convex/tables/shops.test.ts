import { validate } from 'convex-helpers/validators';
import { describe, expect, it } from 'vitest';

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
    commerce: {
        maxQuantity: 199_999,
        processingTimeInDays: 5,
        productsPerPage: 24,
        geoRedirectDismissalHours: 48,
        currency: 'USD',
        freeShippingThresholds: [
            { currencyCode: 'USD', amount: 75 },
            { currencyCode: 'EUR', amount: 70 },
        ],
    },
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

    it('accepts a per-shop default currency', () => {
        expect(validate(shopValidator, fullShop)).toBe(true);
    });

    it('rejects an id on a free-shipping threshold row (stored rows carry no id, like accents)', () => {
        const withRowId = {
            ...fullShop,
            commerce: {
                ...fullShop.commerce,
                freeShippingThresholds: [{ currencyCode: 'USD', amount: 75, id: 'row-1' }],
            },
        };
        expect(validate(shopValidator, withRowId)).toBe(false);
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

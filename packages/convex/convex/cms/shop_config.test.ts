import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc, Id } from '../_generated/dataModel';
import schema from '../schema';

/**
 * The trusted Clerk operator issuer the tenant constructors assert against, stubbed into
 * `CLERK_FRONTEND_API_URL` so the issuer check is active under `convex-test` (whose `withIdentity`
 * fakes identities without Convex's real signature/issuer validation).
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/** A fixed epoch-ms stamp for seeded rows' managed timestamps. */
const NOW = 1_700_000_000_000;

const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/shop_config.ts': () => import('./shop_config'),
};

const getRef = makeFunctionReference<'query'>('cms/shop_config:get');
const connectedDomainsRef = makeFunctionReference<'query'>('cms/shop_config:connectedDomains');
const saveRef = makeFunctionReference<'mutation'>('cms/shop_config:save');

/**
 * Seeds an isolated tenant — one operator user, one shop (carrying alternative domains + business
 * data), and the collaborator link — through convex-test's raw `t.run` ctx.
 *
 * @param t - The convex-test harness.
 * @returns The seeded `shops` id.
 */
async function seedTenant(t: ReturnType<typeof convexTest>): Promise<Id<'shops'>> {
    return t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
            email: 'op@a.example.com',
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_a',
            name: 'Shop A',
            domain: 'shop-a.example.com',
            alternativeDomains: ['alt-1.example.com', 'alt-2.example.com'],
            i18n: { defaultLocale: 'en-US' },
            businessData: { legalName: 'Shop A AB' },
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Shop A' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
        return shopId;
    });
}

const asOperator = (t: ReturnType<typeof convexTest>) =>
    t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

beforeEach(() => {
    vi.stubEnv('CLERK_FRONTEND_API_URL', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('cms/shop_config', () => {
    it('projects the real shop row onto the editor document', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t);

        const doc = await asOperator(t).query(getRef, {});

        expect(doc).toMatchObject({
            name: 'Shop A',
            primaryDomain: 'shop-a.example.com',
            i18n: { defaultLocale: 'en-US' },
            businessData: { legalName: 'Shop A AB' },
        });
    });

    it('lists the connected domains, primary first', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t);

        const domains = await asOperator(t).query(connectedDomainsRef, {});

        expect(domains).toEqual(['shop-a.example.com', 'alt-1.example.com', 'alt-2.example.com']);
    });

    it('re-elects the primary domain and derives the alternatives from the leftovers', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedTenant(t);

        await asOperator(t).mutation(saveRef, { data: { primaryDomain: 'alt-1.example.com' } });

        const shop = (await t.run((ctx) => ctx.db.get(shopId))) as Doc<'shops'>;
        expect(shop.domain).toBe('alt-1.example.com');
        expect(shop.alternativeDomains).toEqual(['shop-a.example.com', 'alt-2.example.com']);
    });

    it('ignores a primary-domain pick that is not already connected', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedTenant(t);

        await asOperator(t).mutation(saveRef, { data: { primaryDomain: 'unconnected.example.com' } });

        const shop = (await t.run((ctx) => ctx.db.get(shopId))) as Doc<'shops'>;
        expect(shop.domain).toBe('shop-a.example.com');
        expect(shop.alternativeDomains).toEqual(['alt-1.example.com', 'alt-2.example.com']);
    });

    it('merges business data and default locale without erasing untouched fields', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedTenant(t);

        await asOperator(t).mutation(saveRef, {
            data: {
                i18n: { defaultLocale: 'sv-SE' },
                businessData: { legalName: 'Renamed AB', supportEmail: 'hi@a.test' },
            },
        });

        const shop = (await t.run((ctx) => ctx.db.get(shopId))) as Doc<'shops'>;
        expect(shop.i18n?.defaultLocale).toBe('sv-SE');
        expect(shop.businessData?.legalName).toBe('Renamed AB');
        expect(shop.businessData?.supportEmail).toBe('hi@a.test');
        // The logo asset is untouched when no media is picked.
        expect(shop.design.header.logo.src).toBe('https://cdn/logo.png');
    });
});

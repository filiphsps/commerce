import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it } from 'vitest';

import schema from '../schema';
import * as shops from './shops';

/**
 * The Convex isolate tsconfig ships no `@types/node`, so `process` is not a known global at type
 * level (production code bridges this in lib/env.ts); declare the minimal ambient shape the
 * server-secret gate reads.
 */
declare const process: { env: Record<string, string | undefined> };

const SERVER_SECRET = 'test-server-secret-value';

/**
 * convex-test resolves functions through a hand-built module map (see lib/system.test.ts for the
 * rationale); point the real `db/shops` module at its deployed path so the secret-gated reads under
 * test run exactly as deployed.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/db/shops.ts': () => Promise.resolve(shops),
};

type DomainArgs = { serverSecret: string; domain: string };
type ShopView = { shop: { _id: string; legacyId: string } } | null;
type SensitiveView = ({ credentials: { token?: string; clientSecret?: string } } & NonNullable<ShopView>) | null;

const byDomainRef = makeFunctionReference<'query', DomainArgs, ShopView>('db/shops:byDomain');
const byDomainWithCredentialsRef = makeFunctionReference<'query', DomainArgs, SensitiveView>(
    'db/shops:byDomainWithCredentials',
);
type VerificationView = { domain: string; status?: string; via?: string } | null;
const domainVerificationRef = makeFunctionReference<'query', DomainArgs, VerificationView>(
    'db/shops:domainVerification',
);

/**
 * Seeds one shop with a primary + alternative domain (one `shopDomains` row each, mirroring the
 * write-side de-embedding) and a split-out credentials row.
 *
 * @param t - The convex-test harness.
 * @returns The seeded shop's id.
 */
function seedShop(t: ReturnType<typeof convexTest>): Promise<string> {
    const now = 1_700_000_000_000;
    return t.run(async (ctx) => {
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_acme',
            name: 'Acme',
            domain: 'acme.example.com',
            alternativeDomains: ['alt.example.com'],
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Acme' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert('shopDomains', { shop: shopId, domain: 'acme.example.com' });
        await ctx.db.insert('shopDomains', { shop: shopId, domain: 'alt.example.com' });
        await ctx.db.insert('shopCredentials', { shop: shopId, token: 'SECRET', clientSecret: 'CS' });
        return shopId;
    });
}

describe('db/shops domain resolution', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
    });

    it('resolves the primary domain and any alternative domain to the SAME shop', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        const shopId = await seedShop(t);

        const primary = await t.query(byDomainRef, { serverSecret: SERVER_SECRET, domain: 'acme.example.com' });
        const alternative = await t.query(byDomainRef, { serverSecret: SERVER_SECRET, domain: 'alt.example.com' });

        expect(primary?.shop._id).toBe(shopId);
        expect(alternative?.shop._id).toBe(shopId);
        expect(primary?.shop.legacyId).toBe('shop_acme');
    });

    it('resolves null for an unclaimed domain', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        await seedShop(t);

        const result = await t.query(byDomainRef, { serverSecret: SERVER_SECRET, domain: 'unknown.example.com' });
        expect(result).toBeNull();
    });

    it('domainVerification returns the routing row state (raw), or null when unknown', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        await seedShop(t);

        const legacy = await t.query(domainVerificationRef, {
            serverSecret: SERVER_SECRET,
            domain: 'acme.example.com',
        });
        expect(legacy).toMatchObject({ domain: 'acme.example.com' });
        // seedShop inserts a legacy row (no status); coalescing to verified is the seam's job, not here.
        expect(legacy?.status).toBeUndefined();

        const missing = await t.query(domainVerificationRef, {
            serverSecret: SERVER_SECRET,
            domain: 'ghost.example.com',
        });
        expect(missing).toBeNull();
    });

    it('keeps the public byDomain payload structurally free of token/clientSecret', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        await seedShop(t);

        const result = await t.query(byDomainRef, { serverSecret: SERVER_SECRET, domain: 'acme.example.com' });
        expect(JSON.stringify(result)).not.toContain('SECRET');
        expect(result).not.toHaveProperty('credentials');
    });

    it('attaches the split-out credentials only on the credentialed read', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        await seedShop(t);

        const result = await t.query(byDomainWithCredentialsRef, {
            serverSecret: SERVER_SECRET,
            domain: 'acme.example.com',
        });
        expect(result?.credentials).toEqual({ token: 'SECRET', clientSecret: 'CS' });
    });

    it('rejects a caller presenting no valid server secret', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        await seedShop(t);

        await expect(t.query(byDomainRef, { serverSecret: 'wrong', domain: 'acme.example.com' })).rejects.toMatchObject(
            { data: { code: 'SERVER_SECRET_INVALID' } },
        );
    });
});

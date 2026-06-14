import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it } from 'vitest';

import schema from '../schema';
import * as shopDomainWrite from './shop_domain_write';

/**
 * The Convex isolate tsconfig ships no `@types/node`; declare the minimal ambient `process` the
 * server-secret gate reads (mirrors db/shop_write.test.ts).
 */
declare const process: { env: Record<string, string | undefined> };

const SERVER_SECRET = 'test-server-secret-value';

const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/db/shop_domain_write.ts': () => Promise.resolve(shopDomainWrite),
};

type SetVerifArgs = {
    serverSecret: string;
    domain: string;
    status: 'pending' | 'verified' | 'failed';
    via?: 'vercel' | 'service_domain' | 'localhost';
    verifiedAt?: number;
};
const setVerificationRef = makeFunctionReference<'mutation', SetVerifArgs, { ok: boolean }>(
    'db/shop_domain_write:setDomainVerification',
);

/**
 * Builds a fresh secret-armed convex-test harness.
 *
 * @returns The harness.
 */
function harness(): ReturnType<typeof convexTest> {
    process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
    return convexTest(schema, modules);
}

/**
 * Seeds one shop and a single pending `shopDomains` routing row for it.
 *
 * @param t - The convex-test harness.
 * @param domain - The routable domain to seed.
 */
async function seedDomain(t: ReturnType<typeof convexTest>, domain: string): Promise<void> {
    const now = 1_700_000_000_000;
    await t.run(async (ctx) => {
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_seed',
            name: 'Seed',
            domain,
            design: { header: { logo: { width: 1, height: 1, src: 'x', alt: 'x' } }, accents: [] },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert('shopDomains', { shop: shopId, domain, status: 'pending' });
    });
}

describe('db/shop_domain_write:setDomainVerification', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
    });

    it('patches status/via/timestamps on the routing row', async () => {
        const t = harness();
        await seedDomain(t, 'verify.example.com');

        const result = await t.mutation(setVerificationRef, {
            serverSecret: SERVER_SECRET,
            domain: 'verify.example.com',
            status: 'verified',
            via: 'vercel',
            verifiedAt: 1_700_000_000_000,
        });
        expect(result).toEqual({ ok: true });

        await t.run(async (ctx) => {
            const rows = await ctx.db.query('shopDomains').collect();
            const row = rows.find((entry) => entry.domain === 'verify.example.com');
            expect(row?.status).toBe('verified');
            expect(row?.via).toBe('vercel');
            expect(row?.verifiedAt).toBe(1_700_000_000_000);
            expect(typeof row?.lastCheckedAt).toBe('number');
        });
    });

    it('is a no-op for an unknown domain', async () => {
        const t = harness();
        const result = await t.mutation(setVerificationRef, {
            serverSecret: SERVER_SECRET,
            domain: 'nobody.example.com',
            status: 'failed',
        });
        expect(result).toEqual({ ok: false });
    });
});

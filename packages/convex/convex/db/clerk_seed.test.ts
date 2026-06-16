import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import * as syncModule from '../clerk/sync';
import schema from '../schema';
import * as clerkSeed from './clerk_seed';
import * as shopWrite from './shop_write';
import * as shops from './shops';

/**
 * The Convex isolate tsconfig ships no `@types/node`, so `process` is not a known global at type level
 * (production code bridges this in lib/env.ts); declare the minimal ambient shape the server-secret
 * gate reads.
 */
declare const process: { env: Record<string, string | undefined> };

const SERVER_SECRET = 'test-server-secret-value';
const SHOP_LEGACY_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6';

/**
 * convex-test resolves functions through a hand-built module map; point the modules under test (and
 * the shop-write seam the fixture uses to create the canonical shop) at their deployed paths so they
 * run exactly as deployed, including the cross-module `clerk/sync` projection import.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/db/clerk_seed.ts': () => Promise.resolve(clerkSeed),
    '/convex/db/shop_write.ts': () => Promise.resolve(shopWrite),
    '/convex/db/shops.ts': () => Promise.resolve(shops),
    '/convex/clerk/sync.ts': () => Promise.resolve(syncModule),
};

type SeedArgs = {
    serverSecret: string;
    clerkUserId: string;
    email: string;
    name: string;
    clerkOrgId: string;
    orgName: string;
    orgSlug: string;
    role?: string;
    shopLegacyId: string;
};
type SeedView = { userId: string; clerkOrgId: string; shopId: string };

const seedClerkOperatorRef = makeFunctionReference<'mutation', SeedArgs, SeedView>('db/clerk_seed:seedClerkOperator');
const upsertShopRef = makeFunctionReference<'mutation'>('db/shop_write:upsertShop');

const baseShop = {
    name: 'Nordcom Demo',
    domain: 'nordcom-demo-shop.com',
    alternativeDomains: [],
    design: { header: { logo: { width: 1, height: 1, src: 'https://cdn/logo.png', alt: 'Demo' } }, accents: [] },
    commerceProvider: { type: 'stripe', authentication: {} },
};

/**
 * Builds a fresh secret-armed convex-test harness with the canonical shop already seeded under the
 * shared `SHOP_LEGACY_ID`, so the Clerk seed has a shop to attach the org to.
 *
 * @returns The harness.
 */
async function harnessWithShop(): Promise<ReturnType<typeof convexTest>> {
    process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
    const t = convexTest(schema, modules);
    await t.mutation(upsertShopRef, {
        serverSecret: SERVER_SECRET,
        legacyId: SHOP_LEGACY_ID,
        upsert: true,
        shop: baseShop,
    });
    return t;
}

const seedArgs: Omit<SeedArgs, 'serverSecret'> = {
    clerkUserId: 'user_e2e',
    email: 'e2e-test+clerk_test@example.com',
    name: 'E2E Test User',
    clerkOrgId: 'org_e2e',
    orgName: 'E2E Org',
    orgSlug: 'e2e-org',
    shopLegacyId: SHOP_LEGACY_ID,
};

describe('db/clerk_seed:seedClerkOperator', () => {
    it('seeds the user (with clerkUserId), org, membership, shop ownership, and projected collaborator', async () => {
        const t = await harnessWithShop();

        const view = await t.mutation(seedClerkOperatorRef, { serverSecret: SERVER_SECRET, ...seedArgs });
        expect(view.clerkOrgId).toBe('org_e2e');

        const users = await t.run((ctx) => ctx.db.query('users').collect());
        const user = users.find((row) => row.clerkUserId === 'user_e2e');
        expect(user?.email).toBe('e2e-test+clerk_test@example.com');

        const orgs = await t.run((ctx) => ctx.db.query('orgs').collect());
        expect(orgs.find((row) => row.clerkOrgId === 'org_e2e')?.name).toBe('E2E Org');

        const memberships = await t.run((ctx) => ctx.db.query('orgMemberships').collect());
        const membership = memberships.find((row) => row.clerkOrgId === 'org_e2e');
        expect(membership?.role).toBe('org:admin');

        const shops = await t.run((ctx) => ctx.db.query('shops').collect());
        expect(shops.find((row) => row.clerkOrgId === 'org_e2e')?._id).toBe(view.shopId);

        const collaborators = await t.run((ctx) => ctx.db.query('shopCollaborators').collect());
        expect(collaborators).toHaveLength(1);
        expect(collaborators[0]?.user).toBe(view.userId);
        expect(collaborators[0]?.permissions).toEqual(['admin']);
    });

    it('is idempotent — a second run adds no duplicate user, org, membership, or collaborator rows', async () => {
        const t = await harnessWithShop();
        await t.mutation(seedClerkOperatorRef, { serverSecret: SERVER_SECRET, ...seedArgs });
        await t.mutation(seedClerkOperatorRef, { serverSecret: SERVER_SECRET, ...seedArgs });

        const users = await t.run((ctx) => ctx.db.query('users').collect());
        const orgs = await t.run((ctx) => ctx.db.query('orgs').collect());
        const memberships = await t.run((ctx) => ctx.db.query('orgMemberships').collect());
        const collaborators = await t.run((ctx) => ctx.db.query('shopCollaborators').collect());
        expect(users).toHaveLength(1);
        expect(orgs).toHaveLength(1);
        expect(memberships).toHaveLength(1);
        expect(collaborators).toHaveLength(1);
    });

    it('links an existing email-keyed user row instead of inserting a duplicate', async () => {
        const t = await harnessWithShop();
        const now = Date.now();
        await t.run((ctx) =>
            ctx.db.insert('users', {
                email: 'e2e-test+clerk_test@example.com',
                name: 'Pre-existing',
                emailVerified: null,
                identities: [],
                createdAt: now,
                updatedAt: now,
            }),
        );

        await t.mutation(seedClerkOperatorRef, { serverSecret: SERVER_SECRET, ...seedArgs });

        const users = await t.run((ctx) => ctx.db.query('users').collect());
        expect(users).toHaveLength(1);
        expect(users[0]?.clerkUserId).toBe('user_e2e');
    });

    it('rejects when the shop to attach the org to does not exist', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        await expect(
            t.mutation(seedClerkOperatorRef, {
                serverSecret: SERVER_SECRET,
                ...seedArgs,
                shopLegacyId: 'missing-legacy-id',
            }),
        ).rejects.toThrow();
    });
});

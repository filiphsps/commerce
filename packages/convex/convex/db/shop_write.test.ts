import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import schema from '../schema';
import * as shopWrite from './shop_write';

/**
 * The Convex isolate tsconfig ships no `@types/node`, so `process` is not a known global at type
 * level (production code bridges this in lib/env.ts); declare the minimal ambient shape the
 * server-secret gate reads.
 */
declare const process: { env: Record<string, string | undefined> };

const SERVER_SECRET = 'test-server-secret-value';

/**
 * convex-test resolves functions through a hand-built module map (see lib/system.test.ts for the
 * rationale); point the real `db/shop_write` module at its deployed path so the atomic write under
 * test runs exactly as deployed.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/db/shop_write.ts': () => Promise.resolve(shopWrite),
};

type UpsertArgs = {
    serverSecret: string;
    legacyId?: string;
    upsert?: boolean;
    shop: Record<string, unknown>;
    credentials?: { token?: string; clientSecret?: string };
    collaborators?: { user: string; permissions: string[] }[];
};
type WriteView = {
    shop: { _id: string; legacyId: string; name: string; domain: string; alternativeDomains?: string[] };
    collaborators: { user: string; permissions: string[] }[];
} | null;

const upsertShopRef = makeFunctionReference<'mutation', UpsertArgs, WriteView>('db/shop_write:upsertShop');

const baseShop = {
    name: 'Acme',
    domain: 'acme.example.com',
    alternativeDomains: ['alt-1.example.com', 'alt-2.example.com'],
    design: {
        header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Acme' } },
        accents: [],
    },
    commerceProvider: { type: 'stripe', authentication: {} },
};

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
 * Seeds one platform user the collaborator-sync cases can reference.
 *
 * @param t - The convex-test harness.
 * @param email - The unique email for the row.
 * @returns The seeded user's id string.
 */
function seedUser(t: ReturnType<typeof convexTest>, email: string): Promise<string> {
    const now = 1_700_000_000_000;
    return t.run(async (ctx) =>
        ctx.db.insert('users', {
            email,
            name: 'User',
            identities: [],
            emailVerified: null,
            createdAt: now,
            updatedAt: now,
        }),
    );
}

describe('db/shop_write:upsertShop', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
        vi.restoreAllMocks();
    });

    it('creates the shop, credentials, domain rows, and collaborator join in ONE mutation', async () => {
        const t = harness();
        const userId = await seedUser(t, 'one@example.com');

        const view = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            shop: baseShop,
            credentials: { token: 'SECRET', clientSecret: 'CS' },
            collaborators: [{ user: userId, permissions: ['admin'] }],
        });

        expect(view?.shop.name).toBe('Acme');
        // A fresh row mints its legacyId as its own document id (the post-migration id contract).
        expect(view?.shop.legacyId).toBe(view?.shop._id);
        expect(view?.collaborators).toEqual([{ user: userId, permissions: ['admin'] }]);

        await t.run(async (ctx) => {
            const domains = await ctx.db.query('shopDomains').collect();
            expect(domains.map((row) => row.domain).sort()).toEqual([
                'acme.example.com',
                'alt-1.example.com',
                'alt-2.example.com',
            ]);
            const credentials = await ctx.db.query('shopCredentials').collect();
            expect(credentials).toHaveLength(1);
            expect(credentials[0]?.token).toBe('SECRET');
            const collaborators = await ctx.db.query('shopCollaborators').collect();
            expect(collaborators).toHaveLength(1);
        });
    });

    it('reconciles a domain-set shrink (3 -> 1) by deleting the stale rows in the same write', async () => {
        const t = harness();
        const created = await t.mutation(upsertShopRef, { serverSecret: SERVER_SECRET, shop: baseShop });
        const legacyId = created?.shop.legacyId as string;

        const updated = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            legacyId,
            upsert: false,
            shop: { domain: 'acme.example.com', alternativeDomains: [] },
        });

        // Merge semantics: untouched fields survive the partial update.
        expect(updated?.shop.name).toBe('Acme');
        await t.run(async (ctx) => {
            const domains = await ctx.db.query('shopDomains').collect();
            expect(domains).toHaveLength(1);
            expect(domains[0]?.domain).toBe('acme.example.com');
        });
    });

    it('degrades a domain claimed by ANOTHER shop to a logged first-match instead of throwing', async () => {
        const t = harness();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const a = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            shop: { ...baseShop, name: 'A', domain: 'shared.example.com', alternativeDomains: [] },
        });
        const b = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            shop: { ...baseShop, name: 'B', domain: 'b.example.com', alternativeDomains: ['shared.example.com'] },
        });

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('already claimed by another shop'));
        await t.run(async (ctx) => {
            const rows = await ctx.db.query('shopDomains').collect();
            const shared = rows.filter((row) => row.domain === 'shared.example.com');
            // First match wins: the incumbent keeps the domain, the new shop gets no second row.
            expect(shared).toHaveLength(1);
            expect(shared[0]?.shop).toBe(a?.shop._id);
            const bDomains = rows.filter((row) => row.shop === b?.shop._id).map((row) => row.domain);
            expect(bDomains).toEqual(['b.example.com']);
        });
    });

    it('degrades corrupted duplicate domain rows to a logged first-match (.unique() never throws site-wide)', async () => {
        const t = harness();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const a = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            shop: { ...baseShop, name: 'A', domain: 'dup.example.com', alternativeDomains: [] },
        });
        const b = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            shop: { ...baseShop, name: 'B', domain: 'b.example.com', alternativeDomains: [] },
        });
        // Inject the corruption a real `.unique()` would explode on: a second row for the same domain.
        await t.run(async (ctx) => {
            const bId = ctx.db.normalizeId('shops', b?.shop._id as string);
            expect(bId).not.toBeNull();
            if (bId) {
                await ctx.db.insert('shopDomains', { shop: bId, domain: 'dup.example.com' });
            }
        });

        const c = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            shop: { ...baseShop, name: 'C', domain: 'c.example.com', alternativeDomains: ['dup.example.com'] },
        });

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate shopDomains rows'));
        await t.run(async (ctx) => {
            const rows = await ctx.db.query('shopDomains').collect();
            const cDomains = rows.filter((row) => row.shop === c?.shop._id).map((row) => row.domain);
            expect(cDomains).toEqual(['c.example.com']);
            const dupOwners = rows.filter((row) => row.domain === 'dup.example.com').map((row) => row.shop);
            expect(dupOwners).toContain(a?.shop._id);
        });
    });

    it('rolls back the ENTIRE write when a collaborator id is invalid (all-or-nothing)', async () => {
        const t = harness();

        await expect(
            t.mutation(upsertShopRef, {
                serverSecret: SERVER_SECRET,
                shop: baseShop,
                credentials: { token: 'SECRET' },
                collaborators: [{ user: 'not-a-user-id', permissions: ['admin'] }],
            }),
        ).rejects.toMatchObject({ data: { code: 'SHOP_WRITE_INVALID_COLLABORATOR' } });

        await t.run(async (ctx) => {
            expect(await ctx.db.query('shops').collect()).toEqual([]);
            expect(await ctx.db.query('shopDomains').collect()).toEqual([]);
            expect(await ctx.db.query('shopCredentials').collect()).toEqual([]);
            expect(await ctx.db.query('shopCollaborators').collect()).toEqual([]);
        });
    });

    it('rejects an incomplete insert and writes nothing', async () => {
        const t = harness();
        await expect(
            t.mutation(upsertShopRef, { serverSecret: SERVER_SECRET, shop: { name: 'No domain' } }),
        ).rejects.toMatchObject({ data: { code: 'SHOP_WRITE_INCOMPLETE' } });
        await t.run(async (ctx) => {
            expect(await ctx.db.query('shops').collect()).toEqual([]);
        });
    });

    it('returns null (and writes nothing) for an unknown legacyId without upsert', async () => {
        const t = harness();
        const view = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            legacyId: 'missing-shop',
            upsert: false,
            shop: { name: 'Ghost' },
        });
        expect(view).toBeNull();
        await t.run(async (ctx) => {
            expect(await ctx.db.query('shops').collect()).toEqual([]);
        });
    });

    it('replaces credentials and syncs the collaborator join transactionally on update', async () => {
        const t = harness();
        const first = await seedUser(t, 'first@example.com');
        const second = await seedUser(t, 'second@example.com');

        const created = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            shop: baseShop,
            credentials: { token: 'OLD' },
            collaborators: [{ user: first, permissions: ['admin'] }],
        });
        const legacyId = created?.shop.legacyId as string;

        const updated = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            legacyId,
            upsert: false,
            shop: {},
            credentials: { token: 'NEW', clientSecret: 'CS' },
            collaborators: [{ user: second, permissions: ['read'] }],
        });

        expect(updated?.collaborators).toEqual([{ user: second, permissions: ['read'] }]);
        await t.run(async (ctx) => {
            const credentials = await ctx.db.query('shopCredentials').collect();
            expect(credentials).toHaveLength(1);
            expect(credentials[0]?.token).toBe('NEW');
            expect(credentials[0]?.clientSecret).toBe('CS');
            const collaborators = await ctx.db.query('shopCollaborators').collect();
            expect(collaborators).toHaveLength(1);
            expect(collaborators[0]?.user).toBe(second);
        });
    });

    it('leaves the credentials row untouched when the write carries no bag', async () => {
        const t = harness();
        const created = await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            shop: baseShop,
            credentials: { token: 'KEEP' },
        });

        await t.mutation(upsertShopRef, {
            serverSecret: SERVER_SECRET,
            legacyId: created?.shop.legacyId as string,
            upsert: false,
            shop: { name: 'Renamed' },
        });

        await t.run(async (ctx) => {
            const credentials = await ctx.db.query('shopCredentials').collect();
            expect(credentials[0]?.token).toBe('KEEP');
        });
    });
});

import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as constructors from '../_constructors';
import schema from '../schema';

const { systemMutation, systemQuery, tenantQuery } = constructors;

/**
 * Phase 2 (CONVEXCORE) exit-criteria suite — the system-tier escape hatch and the constructor barrel.
 * Completes the contrast `lib/system.test.ts` deferred until the tenant tier existed: the SAME exempt
 * platform-global tables (`featureFlags`, `users`) that the deny-default tenant tier reads as empty are
 * fully readable and writable through `systemQuery`/`systemMutation`, proving the raw-db escape hatch is
 * the one sanctioned path to them. The barrel-shape case pins `_constructors` to exactly the six
 * sanctioned builders so an RLS-bypassing raw builder can never leak through the documented entrypoint.
 */

/**
 * The trusted NextAuth issuer the tenant constructors assert against (via `resolveAdminShopId`). Stubbed
 * into `CONVEX_AUTH_ISSUER` for every case so the issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * A fixed epoch-ms stamp for seeded rows' managed `createdAt`/`updatedAt`. Its exact value is irrelevant
 * to the escape-hatch assertions; it only has to satisfy the required numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Seeds the exempt/global rows through {@link systemMutation}'s raw writer — one platform-global feature
 * flag and one standalone platform user — plus a minimal tenant (operator user, shop, collaborator) so a
 * {@link tenantQuery} can later be run under a real identity against the very same data. The successful
 * inserts ARE the write-side escape-hatch proof: the deny-default tenant writer rejects these tables.
 *
 * @returns The seeded flag, standalone-user, and shop ids for the read-back assertions.
 */
const seedExemptTables = systemMutation({
    args: { operatorEmail: v.string() },
    handler: async (ctx, { operatorEmail }) => {
        const flagId = await ctx.db.insert('featureFlags', {
            legacyId: 'flag_legacy',
            key: 'global.flag',
            defaultValue: true,
            targeting: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        const standaloneUserId = await ctx.db.insert('users', {
            email: 'platform-user@example.com',
            name: 'Platform User',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });

        const operatorId = await ctx.db.insert('users', {
            email: operatorEmail,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_escape_hatch',
            name: 'Escape Hatch',
            domain: 'escape-hatch.example.com',
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Escape Hatch' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop: shopId, user: operatorId, permissions: ['admin'] });

        return { flagId, standaloneUserId, shopId };
    },
});

/**
 * A {@link systemQuery} fixture reading the exempt/global tables straight off the raw `ctx.db` with no
 * tenant filter — the read-side escape hatch under test.
 */
const readExemptTables = systemQuery({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query('users').collect();
        return {
            flags: await ctx.db.query('featureFlags').collect(),
            // Projected (and sorted) in the typed handler so the untyped wire result needs no re-mapping.
            userEmails: users.map((user) => user.email).sort(),
        };
    },
});

/**
 * A {@link tenantQuery} fixture scanning the SAME exempt tables through the deny-default wrapped reader.
 * Both scans must come back empty: the tenant tier has no rule for these tables, so the system tier is
 * the only path that can see them.
 */
const scanExemptTablesAsTenant = tenantQuery({
    args: {},
    handler: async (ctx) => ({
        flags: (await ctx.db.query('featureFlags').collect()).length,
        users: (await ctx.db.query('users').collect()).length,
    }),
});

/**
 * Hand-built module map for `convex-test` (see `lib/auth.test.ts` for the full rationale): Biome forbids
 * exporting fixtures from a test file and the default glob excludes the self-importing module, so the
 * fixtures are mapped to this module's path to resolve by `FunctionReference`, running the real
 * constructors end to end.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/__tests__/system-escape-hatch.test.ts': () =>
        Promise.resolve({ seedExemptTables, readExemptTables, scanExemptTablesAsTenant }),
};

const seedExemptRef = makeFunctionReference<'mutation'>('__tests__/system-escape-hatch.test:seedExemptTables');
const readExemptRef = makeFunctionReference<'query'>('__tests__/system-escape-hatch.test:readExemptTables');
const scanAsTenantRef = makeFunctionReference<'query'>('__tests__/system-escape-hatch.test:scanExemptTablesAsTenant');

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Phase 2 exit: system-tier escape hatch for exempt/global tables', () => {
    it('writes and reads featureFlags + users through the raw system tier', async () => {
        const t = convexTest(schema, modules);
        const seeded = await t.mutation(seedExemptRef, { operatorEmail: 'op@example.com' });

        const all = await t.query(readExemptRef, {});

        // The seed's systemMutation inserts already proved raw write access; the read-back proves the
        // raw reader sees the global rows the tenant tier denies (asserted in the contrast case below).
        expect(all.flags).toHaveLength(1);
        const [flag] = all.flags;
        expect(flag?._id).toBe(seeded.flagId);
        expect(flag?.key).toBe('global.flag');

        // BOTH users — the standalone platform user and the tenant operator — are visible unscoped.
        expect(all.userEmails).toEqual(['op@example.com', 'platform-user@example.com']);
    });

    it('reads the same exempt tables as empty through the tenant tier (system is the only path)', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedExemptRef, { operatorEmail: 'op@example.com' });

        const asOperator = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|op', email: 'op@example.com' });
        const counts = await asOperator.query(scanAsTenantRef, {});

        // One flag and two users exist (read back through the system tier above), yet the deny-default
        // tenant reader filters every row: the escape hatch, not the tenant tier, owns these tables.
        expect(counts).toEqual({ flags: 0, users: 0 });
    });
});

describe('Phase 2 exit: the _constructors barrel surface', () => {
    it('exposes exactly the six sanctioned builders and no raw _generated escape', () => {
        // Pinned by exact value so adding (or leaking) ANY export — especially a raw `query`/`mutation`/
        // `internalQuery` re-export from `_generated/server` — fails this gate and forces a review.
        expect(Object.keys(constructors).sort()).toEqual([
            'serverMutation',
            'serverQuery',
            'systemMutation',
            'systemQuery',
            'tenantMutation',
            'tenantQuery',
        ]);
    });
});

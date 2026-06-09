import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { systemMutation, tenantMutation, tenantQuery } from '../_constructors';
import schema from '../schema';

/**
 * Phase 2 (CONVEXCORE) exit-criteria suite — deny-default + tenant isolation through the REAL public
 * constructors (the `_constructors` barrel), end to end: identity → `resolveAdminShopId` → RLS-wrapped
 * `ctx.db`. The sibling `lib/rls.test.ts` exercises the wrappers in isolation; this suite is the gate
 * proving the assembled tenant tier holds the contract a caller actually hits over the wire.
 *
 * LOAD-BEARING RED-CHECK (acceptance criterion: the suite must fail if a rule is removed). Performed
 * manually before landing: the `reviews` rule block was temporarily deleted from `tenantRules` in
 * `lib/rls.ts`, the suite re-run (4 failed | 3 passed), and the following went RED before the rule was
 * restored verbatim:
 * - "scopes tenant reads to the resolved shop…" and "ignores a client-supplied shopId arg…" failed with
 *   `expected [] to deeply equal [ '…shops' ]` — deny-default swallowed the now rule-less table, so even
 *   a tenant's OWN rows read back empty;
 * - "lets a tenant write its own rows…" failed — the own-tenant insert was denied; and
 * - "denies a patch of a foreign tenant row…" failed with `promise resolved "null" instead of rejecting`
 *   (a rule-less table drops out of the wrapped writer's rules-keyed table inference, so the bare-id
 *   patch bypassed the check — the failure still trips this gate, which is what the red-check proves).
 * Green again with the rule restored, proving these assertions pin the rule set rather than vacuously pass.
 */

/**
 * The trusted NextAuth issuer the tenant constructors assert against (via `resolveAdminShopId`). Stubbed
 * into `CONVEX_AUTH_ISSUER` for every case so the issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * A fixed epoch-ms stamp for seeded rows' managed `createdAt`/`updatedAt`. Its exact value is irrelevant
 * to the isolation assertions; it only has to satisfy the required numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Seeds two fully isolated tenants through the system tier's raw `ctx.db` (the sanctioned unscoped path):
 * operator A collaborating only on shop A and operator B only on shop B, each shop owning exactly one
 * pre-existing review. Also plants one row in each rule-less table class — `pages` (tenant-scoped but
 * string-keyed, so deliberately outside `tenantRules`) and the platform-global `featureFlags` — so the
 * deny-default scans below have real rows to NOT see.
 *
 * @returns The seeded `shops` ids keyed by operator plus shop B's review id (the cross-tenant tamper target).
 */
const seedTenants = systemMutation({
    args: { emailA: v.string(), emailB: v.string() },
    handler: async (ctx, { emailA, emailB }) => {
        /**
         * Inserts one operator user, one shop, a collaborator linking them, and a single owned review.
         *
         * @param email - The operator's email (the identity claim resolution keys on).
         * @param legacyId - The shop's legacy/source id and display name seed.
         * @param domain - The shop's primary domain.
         * @returns The created `shops` id and its seeded review's id.
         */
        const seedTenant = async (email: string, legacyId: string, domain: string) => {
            const userId = await ctx.db.insert('users', {
                email,
                name: 'Operator',
                emailVerified: null,
                identities: [],
                createdAt: NOW,
                updatedAt: NOW,
            });
            const shopId = await ctx.db.insert('shops', {
                legacyId,
                name: legacyId,
                domain,
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                    accents: [],
                },
                commerceProvider: { type: 'stripe', authentication: {} },
                createdAt: NOW,
                updatedAt: NOW,
            });
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
            const reviewId = await ctx.db.insert('reviews', { shopId, createdAt: NOW, updatedAt: NOW });
            return { shopId, reviewId };
        };

        const tenantA = await seedTenant(emailA, 'shop_a', 'a.example.com');
        const tenantB = await seedTenant(emailB, 'shop_b', 'b.example.com');

        await ctx.db.insert('pages', {
            shop: tenantA.shopId,
            title: 'Home',
            slug: 'home',
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('featureFlags', {
            legacyId: 'flag_legacy',
            key: 'global.flag',
            defaultValue: true,
            targeting: [],
            createdAt: NOW,
            updatedAt: NOW,
        });

        return { shopAId: tenantA.shopId, shopBId: tenantB.shopId, reviewBId: tenantB.reviewId };
    },
});

/**
 * A {@link tenantQuery} fixture listing reviews through the tenant-scoped, RLS-wrapped `ctx.db`. It
 * declares a client `shopId` arg purely to PROVE the constructor ignores it: the arg is echoed back as
 * `requestedShopId` so a test can confirm the server-resolved `ctx.shopId` wins regardless of what the
 * client passed.
 */
const listReviewsFixture = tenantQuery({
    args: { shopId: v.optional(v.id('shops')) },
    handler: async (ctx, args) => {
        // Unbounded scan: the wrapped reader must still deny-filter to the resolved tenant's rows only.
        const rows = await ctx.db.query('reviews').collect();
        return {
            resolvedShopId: ctx.shopId,
            requestedShopId: args.shopId ?? null,
            reviewShopIds: rows.map((row) => row.shopId),
        };
    },
});

/**
 * A {@link tenantQuery} fixture scanning the rule-less tables through the wrapped reader: `pages`
 * (string-keyed CMS content, deliberately outside `tenantRules`) and the platform-global `featureFlags`
 * and `users`. Under `defaultPolicy: 'deny'` every scan must come back EMPTY even though the seed planted
 * real rows — the deny-default exit criterion.
 */
const scanRuleLessTablesFixture = tenantQuery({
    args: {},
    handler: async (ctx) => ({
        pages: (await ctx.db.query('pages').collect()).length,
        featureFlags: (await ctx.db.query('featureFlags').collect()).length,
        users: (await ctx.db.query('users').collect()).length,
    }),
});

/**
 * A {@link tenantMutation} fixture inserting a review owned by an EXPLICIT shop id (defaulting to the
 * server-resolved tenant). The happy path proves the wrapped writer admits a tenant's own writes under
 * deny-default; passing the OTHER tenant's id proves the `insert` predicate rejects a forged owner.
 */
const addReviewFixture = tenantMutation({
    args: { ownerShopId: v.optional(v.id('shops')) },
    handler: async (ctx, args) =>
        ctx.db.insert('reviews', { shopId: args.ownerShopId ?? ctx.shopId, createdAt: NOW, updatedAt: NOW }),
});

/**
 * A {@link tenantMutation} fixture inserting into the rule-less `pages` table through the wrapped writer.
 * Must ALWAYS reject under deny-default — the write-side companion to {@link scanRuleLessTablesFixture}.
 */
const insertPageFixture = tenantMutation({
    args: {},
    handler: async (ctx) =>
        ctx.db.insert('pages', { shop: ctx.shopId, title: 'Blocked', slug: 'blocked', createdAt: NOW, updatedAt: NOW }),
});

/**
 * A {@link tenantMutation} fixture patching an arbitrary review by id. Used with the OTHER tenant's
 * review id to prove the wrapped writer re-checks the read predicate before mutating: the cross-tenant
 * row is unreadable, so the patch dies as "no read access" instead of touching the foreign row.
 */
const patchReviewFixture = tenantMutation({
    args: { reviewId: v.id('reviews') },
    handler: async (ctx, { reviewId }) => ctx.db.patch(reviewId, { updatedAt: NOW + 1 }),
});

/**
 * Hand-built module map for `convex-test` (see `lib/auth.test.ts` for the full rationale): Biome forbids
 * exporting fixtures from a test file and the default glob excludes the self-importing module, so the
 * fixtures are mapped to this module's path to resolve by `FunctionReference`, running the real
 * constructors end to end.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/__tests__/rls-deny-default.test.ts': () =>
        Promise.resolve({
            seedTenants,
            listReviewsFixture,
            scanRuleLessTablesFixture,
            addReviewFixture,
            insertPageFixture,
            patchReviewFixture,
        }),
};

const seedTenantsRef = makeFunctionReference<'mutation'>('__tests__/rls-deny-default.test:seedTenants');
const listReviewsRef = makeFunctionReference<'query'>('__tests__/rls-deny-default.test:listReviewsFixture');
const scanRuleLessRef = makeFunctionReference<'query'>('__tests__/rls-deny-default.test:scanRuleLessTablesFixture');
const addReviewRef = makeFunctionReference<'mutation'>('__tests__/rls-deny-default.test:addReviewFixture');
const insertPageRef = makeFunctionReference<'mutation'>('__tests__/rls-deny-default.test:insertPageFixture');
const patchReviewRef = makeFunctionReference<'mutation'>('__tests__/rls-deny-default.test:patchReviewFixture');

/**
 * Boots a fresh in-memory backend, seeds both tenants, and returns the harness plus identity-bound
 * accessors for each operator. Factored out because every case below needs the identical two-tenant world.
 *
 * @returns The harness, the seeded ids, and the two operators' identity-scoped accessors.
 */
async function setUpTwoTenants() {
    const t = convexTest(schema, modules);
    const seeded = await t.mutation(seedTenantsRef, { emailA: 'op-a@example.com', emailB: 'op-b@example.com' });
    const asOperatorA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
    const asOperatorB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op-b@example.com' });
    return { t, ...seeded, asOperatorA, asOperatorB };
}

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Phase 2 exit: deny-default through the tenant tier', () => {
    it('reads every rule-less table as empty despite seeded rows (pages, featureFlags, users)', async () => {
        const { asOperatorA } = await setUpTwoTenants();

        const counts = await asOperatorA.query(scanRuleLessRef, {});

        // The seed planted one `pages` row, one `featureFlags` row, and two `users` rows; none of these
        // tables carries a rule in `tenantRules`, so the deny-default reader must filter ALL of them out.
        expect(counts).toEqual({ pages: 0, featureFlags: 0, users: 0 });
    });

    it('denies writes into a rule-less table through the tenant tier', async () => {
        const { asOperatorA } = await setUpTwoTenants();

        await expect(asOperatorA.mutation(insertPageRef, {})).rejects.toThrow('insert access not allowed');
    });
});

describe('Phase 2 exit: cross-tenant isolation through the tenant tier', () => {
    it('scopes tenant reads to the resolved shop and hides the other tenant entirely', async () => {
        const { shopAId, shopBId, asOperatorA, asOperatorB } = await setUpTwoTenants();

        const seenByA = await asOperatorA.query(listReviewsRef, {});
        const seenByB = await asOperatorB.query(listReviewsRef, {});

        // Each operator sees exactly its own seeded review off an UNBOUNDED scan — the per-document
        // read predicate (not just index bounding) is what keeps the foreign tenant's row invisible.
        expect(seenByA.resolvedShopId).toBe(shopAId);
        expect(seenByA.reviewShopIds).toEqual([shopAId]);
        expect(seenByB.resolvedShopId).toBe(shopBId);
        expect(seenByB.reviewShopIds).toEqual([shopBId]);
    });

    it('lets a tenant write its own rows but keeps the write invisible to the other tenant', async () => {
        const { shopAId, shopBId, asOperatorA, asOperatorB } = await setUpTwoTenants();

        await asOperatorA.mutation(addReviewRef, {});

        // A's write landed (seed + new row), while B still sees only its own single seeded review.
        const seenByA = await asOperatorA.query(listReviewsRef, {});
        const seenByB = await asOperatorB.query(listReviewsRef, {});
        expect(seenByA.reviewShopIds).toEqual([shopAId, shopAId]);
        expect(seenByB.reviewShopIds).toEqual([shopBId]);
    });

    it('denies an insert forged with the foreign tenant shopId', async () => {
        const { shopBId, asOperatorA } = await setUpTwoTenants();

        await expect(asOperatorA.mutation(addReviewRef, { ownerShopId: shopBId })).rejects.toThrow(
            'insert access not allowed',
        );
    });

    it('denies a patch of a foreign tenant row (write re-checks the read predicate)', async () => {
        const { reviewBId, asOperatorA } = await setUpTwoTenants();

        await expect(asOperatorA.mutation(patchReviewRef, { reviewId: reviewBId })).rejects.toThrow(
            'no read access or doc does not exist',
        );
    });
});

describe('Phase 2 exit: server-trusted shopId provenance', () => {
    it('ignores a client-supplied shopId arg — the identity-resolved tenant wins', async () => {
        const { shopAId, shopBId, asOperatorA } = await setUpTwoTenants();

        // Operator A passes shop B's id as a spoof — the constructor must pin shop A from the identity.
        const result = await asOperatorA.query(listReviewsRef, { shopId: shopBId });

        expect(result.requestedShopId).toBe(shopBId);
        expect(result.resolvedShopId).toBe(shopAId);
        // The scope followed the trusted identity, not the argument: only shop A's review is visible.
        expect(result.reviewShopIds).toEqual([shopAId]);
    });
});

import { ConvexError, v } from 'convex/values';

import { serverMutation } from '../_constructors';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { desiredCollaboratorRows, reconcileCollaboratorRows, type CollaboratorRow } from '../clerk/sync';
import { shopByPublicId } from './shops';

/**
 * Stable {@link ConvexError} codes for the Clerk e2e operator seed, so the test harness can branch on
 * a code rather than string-matching messages.
 */
export const ClerkSeedErrorCode = {
    /** The shop identified by `shopLegacyId` does not exist on the deployment. */
    SHOP_NOT_FOUND: 'CLERK_SEED_SHOP_NOT_FOUND',
} as const;

/**
 * What {@link seedClerkOperator} hands back to the e2e harness: the resolved `users` row id, the org
 * id it mirrored, and the shop id it stamped — enough for the harness to assert the seed landed and to
 * key later reads without a follow-up query.
 */
export type ClerkSeedView = {
    userId: Id<'users'>;
    clerkOrgId: string;
    shopId: Id<'shops'>;
};

/**
 * Upserts the platform `users` row for the e2e Clerk operator, keyed by email and carrying the Clerk
 * subject. Mirrors the webhook/`ensureCurrentUser` resolution (subject-first, then email) WITHOUT the
 * placeholder-merge path, which the e2e seed never produces: the test user is real and email-bearing.
 *
 * @param ctx - The server-tier mutation context (raw cross-tenant `db`).
 * @param clerkUserId - The Clerk user subject (`user_…`) to stamp onto the row.
 * @param email - The operator's email (the `by_email` link / insert key).
 * @param name - The display name to store.
 * @returns The surviving (or newly inserted) `users` row id.
 */
async function upsertOperatorUser(
    ctx: MutationCtx,
    clerkUserId: string,
    email: string,
    name: string,
): Promise<Id<'users'>> {
    const now = Date.now();

    const bySubject = await ctx.db
        .query('users')
        .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', clerkUserId))
        .first();
    if (bySubject) {
        await ctx.db.patch(bySubject._id, { email, name, updatedAt: now });
        return bySubject._id;
    }

    const byEmail = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', email))
        .first();
    if (byEmail) {
        await ctx.db.patch(byEmail._id, { clerkUserId, name, updatedAt: now });
        return byEmail._id;
    }

    return ctx.db.insert('users', {
        email,
        name,
        emailVerified: null,
        identities: [],
        clerkUserId,
        createdAt: now,
        updatedAt: now,
    });
}

/**
 * Upserts the `orgs` mirror row for the e2e Clerk org, keyed on `clerkOrgId` (`orgs.by_clerk_org`).
 * Idempotent: a re-run patches the same row rather than inserting a duplicate.
 *
 * @param ctx - The server-tier mutation context.
 * @param clerkOrgId - The Clerk organization id (`org_…`).
 * @param name - The organization's display name.
 * @param slug - The organization's slug.
 */
async function upsertOrgMirror(ctx: MutationCtx, clerkOrgId: string, name: string, slug: string): Promise<void> {
    const now = Date.now();
    const existing = await ctx.db
        .query('orgs')
        .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
        .first();
    if (existing) {
        await ctx.db.patch(existing._id, { name, slug, updatedAt: now });
        return;
    }
    await ctx.db.insert('orgs', { clerkOrgId, name, slug, createdAt: now, updatedAt: now });
}

/**
 * Upserts the `orgMemberships` mirror row linking the operator to the e2e org, keyed on the
 * `(clerkOrgId, user)` pair (`orgMemberships.by_clerk_org_user`). Idempotent: a re-run patches the
 * role/subject on the existing row rather than inserting a duplicate.
 *
 * @param ctx - The server-tier mutation context.
 * @param clerkOrgId - The Clerk organization id.
 * @param userId - The operator's `users` row id.
 * @param clerkUserId - The operator's Clerk subject.
 * @param role - The Clerk-assigned role string.
 */
async function upsertMembershipMirror(
    ctx: MutationCtx,
    clerkOrgId: string,
    userId: Id<'users'>,
    clerkUserId: string,
    role: string,
): Promise<void> {
    const existing = await ctx.db
        .query('orgMemberships')
        .withIndex('by_clerk_org_user', (q) => q.eq('clerkOrgId', clerkOrgId).eq('user', userId))
        .first();
    if (existing) {
        await ctx.db.patch(existing._id, { role, clerkUserId });
        return;
    }
    await ctx.db.insert('orgMemberships', { clerkOrgId, user: userId, clerkUserId, role, createdAt: Date.now() });
}

/**
 * Re-projects the operator's `shopCollaborators` from their org memberships — the same fan-out the
 * Clerk webhook performs ({@link desiredCollaboratorRows} × {@link reconcileCollaboratorRows}), run
 * inline so the seed produces the identical derived rows the shell's collaborator-based queries read.
 * The DESIRED set is every shop each owning org owns; the CURRENT set is the operator's existing
 * projected rows; the minimal create/delete delta converges them. Idempotent and order-independent.
 *
 * @param ctx - The server-tier mutation context.
 * @param userId - The operator whose projection is recomputed.
 */
async function projectOperatorCollaborators(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
    const memberships = await ctx.db
        .query('orgMemberships')
        .withIndex('by_user', (q) => q.eq('user', userId))
        .collect();

    const shopIdSet = new Set<Id<'shops'>>();
    for (const membership of memberships) {
        const shops = await ctx.db
            .query('shops')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', membership.clerkOrgId))
            .collect();
        for (const shop of shops) {
            shopIdSet.add(shop._id);
        }
    }

    const desired = desiredCollaboratorRows({ shopIds: [...shopIdSet], userId });
    const current: CollaboratorRow[] = (
        await ctx.db
            .query('shopCollaborators')
            .withIndex('by_user', (q) => q.eq('user', userId))
            .collect()
    ).map((row) => ({ shop: row.shop, user: row.user, permissions: row.permissions }));

    const { toCreate, toDelete } = reconcileCollaboratorRows({ userId, current, desired });
    for (const row of toCreate) {
        await ctx.db.insert('shopCollaborators', { shop: row.shop, user: row.user, permissions: row.permissions });
    }
    for (const row of toDelete) {
        const existing = await ctx.db
            .query('shopCollaborators')
            .withIndex('by_shop_user', (q) => q.eq('shop', row.shop).eq('user', userId))
            .first();
        if (existing) {
            await ctx.db.delete(existing._id);
        }
    }
}

/**
 * Server-tier seed mutation that provisions the canonical e2e Clerk operator's identity model onto the
 * deployment IN ONE TRANSACTION, so the admin app under test reads a tenant graph identical to the one
 * the Clerk webhook would have synced. It exists solely for `@nordcom/commerce-test-convex`'s e2e
 * harness, which has the Clerk ids in hand (from the Clerk Backend API) but no webhook delivering them
 * to a local backend — so this re-expresses the webhook's user/org/membership/projection writes behind
 * the same `CONVEX_SERVER_SECRET` gate the rest of the seed uses.
 *
 * Steps, all idempotent end-to-end (a re-run patches in place, never duplicates):
 * 1. Resolve the canonical shop by its public `legacyId` (the harness's idempotency key).
 * 2. Upsert the operator `users` row (subject-first, then email) carrying `clerkUserId`.
 * 3. Upsert the `orgs` + `orgMemberships` mirror rows.
 * 4. Stamp `shops.clerkOrgId` so the org owns the shop (`shops.by_clerk_org`).
 * 5. Re-project `shopCollaborators` from the membership × owned-shops fan-out (decision #11/#13).
 *
 * @returns The operator's `users` id, the org id, and the shop id it stamped.
 * @throws {ConvexError} `CLERK_SEED_SHOP_NOT_FOUND` when no shop carries the supplied `shopLegacyId`.
 * @throws {ConvexError} `SERVER_SECRET_UNCONFIGURED` / `SERVER_SECRET_INVALID` from the server-tier gate.
 */
export const seedClerkOperator = serverMutation({
    args: {
        clerkUserId: v.string(),
        email: v.string(),
        name: v.string(),
        clerkOrgId: v.string(),
        orgName: v.string(),
        orgSlug: v.string(),
        role: v.optional(v.string()),
        shopLegacyId: v.string(),
    },
    handler: async (ctx, args): Promise<ClerkSeedView> => {
        const shop: Doc<'shops'> | null = await shopByPublicId(ctx, args.shopLegacyId);
        if (!shop) {
            throw new ConvexError({
                code: ClerkSeedErrorCode.SHOP_NOT_FOUND,
                message: `No shop with legacyId "${args.shopLegacyId}" to attach the e2e Clerk org to.`,
            });
        }

        const userId = await upsertOperatorUser(ctx, args.clerkUserId, args.email, args.name);
        await upsertOrgMirror(ctx, args.clerkOrgId, args.orgName, args.orgSlug);
        await upsertMembershipMirror(ctx, args.clerkOrgId, userId, args.clerkUserId, args.role ?? 'org:admin');

        if (shop.clerkOrgId !== args.clerkOrgId) {
            await ctx.db.patch(shop._id, { clerkOrgId: args.clerkOrgId, updatedAt: Date.now() });
        }

        await projectOperatorCollaborators(ctx, userId);

        return { userId, clerkOrgId: args.clerkOrgId, shopId: shop._id };
    },
});

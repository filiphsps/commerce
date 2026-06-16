import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import type { GenericMutationCtx } from 'convex/server';
import type { DataModel, Id } from '../_generated/dataModel';
import { internalAction } from '../_generated/server';
import { getServerEnv } from '../lib/env';
import { systemMutation, systemQuery } from '../lib/system';
import { createClerkBackendClient } from './backend_client';
import { desiredCollaboratorRows, reconcileCollaboratorRows, type CollaboratorRow } from './sync';

/**
 * The baseline Clerk role every backfilled collaborator is granted on their shop's owning org —
 * `org:admin` for parity with the pre-Clerk single-permission model (spec decision #13), so the
 * projected `shopCollaborators` row carries `['admin']` exactly as before.
 */
const BACKFILL_ROLE = 'org:admin';

/**
 * Stable {@link ConvexError} codes for the backfill, so a runner can branch on a code rather than
 * string-matching messages.
 */
export const BackfillErrorCode = {
    /** The Clerk secret key is not set on the deployment running the backfill action. */
    SECRET_KEY_UNCONFIGURED: 'CLERK_BACKFILL_SECRET_KEY_UNCONFIGURED',
    /** A shop to backfill could not be re-read inside the apply mutation (it vanished mid-run). */
    SHOP_NOT_FOUND: 'CLERK_BACKFILL_SHOP_NOT_FOUND',
} as const;

/**
 * One collaborator entry in the planning-query output: the operator's `users` row, their email, and
 * whether they already hold a Clerk account (`users.clerkUserId` set). The runner uses
 * `hasClerkAccount` only for reporting; the action re-derives the member/invite split from the same
 * field through {@link planShopOrgBackfill}.
 */
export interface PendingBackfillCollaborator {
    userId: Id<'users'>;
    email: string;
    hasClerkAccount: boolean;
}

/**
 * One shop awaiting an org backfill: the shop row's id + the display identity used to name/slug the
 * Clerk org, plus its joined collaborators. Returned by {@link pendingOrgBackfill}.
 */
export interface PendingBackfillShop {
    shopId: Id<'shops'>;
    name: string;
    domain: string;
    collaborators: PendingBackfillCollaborator[];
}

/**
 * The collaborator shape {@link planShopOrgBackfill} consumes — a structural subset of
 * {@link PendingBackfillCollaborator} carrying the raw `clerkUserId` (present iff the user has a
 * Clerk account) so the planner can both partition AND emit the member's subject without a re-read.
 */
export interface PlannerCollaborator {
    userId: Id<'users'>;
    email: string;
    clerkUserId: string | undefined;
}

/** A collaborator who already has a Clerk account → added as an org member directly. */
export interface PlannedMember {
    userId: Id<'users'>;
    email: string;
    clerkUserId: string;
}

/** A collaborator with no Clerk account yet → invited by email; joins on first sign-up/accept. */
export interface PlannedInvite {
    userId: Id<'users'>;
    email: string;
}

/**
 * The lockout-safe plan for backfilling ONE shop's Clerk org. Pure data the action turns into Clerk
 * Backend calls + mirror writes.
 */
export interface ShopBackfillPlan {
    orgName: string;
    orgSlug: string;
    members: PlannedMember[];
    invites: PlannedInvite[];
    /**
     * Whether it is SAFE to stamp `shops.clerkOrgId` in this pass. The lockout rule: once a shop has
     * `clerkOrgId`, `resolveShopAccess` HARD-FAILS (`SHOP_WITHOUT_ORG` is unreachable once set; the
     * gate then requires an `orgMemberships` row) for any operator not in the org. An unlinked
     * collaborator CANNOT be an `orgMemberships` row yet (the mirror needs a Clerk subject), so
     * stamping while any remain would lock them out. We therefore stamp ONLY when every collaborator
     * is already a Clerk-account member — i.e. `invites` is empty. A deferred shop stays un-stamped
     * (its pre-Clerk, un-backfilled state — exactly where it sits today, so access is not regressed)
     * until a re-run after the invited users accept.
     */
    stampClerkOrgId: boolean;
}

/**
 * Derives a URL-safe org slug from a shop domain: lowercased, non-alphanumeric runs collapsed to a
 * single hyphen, leading/trailing hyphens trimmed. Deterministic so a re-run resolves the SAME slug
 * and the find-or-create probe reuses the existing Clerk org rather than creating a duplicate — the
 * idempotency key for shops whose org was created but not yet stamped.
 *
 * @param domain - The shop's primary routing domain (e.g. `shop.acme.com`).
 * @returns A lowercase, hyphen-separated slug (e.g. `shop-acme-com`).
 */
export function orgSlugFromDomain(domain: string): string {
    return domain
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * The PURE planner (unit-tested without a backend): turns one shop + its collaborators into a
 * lockout-safe {@link ShopBackfillPlan}. Partitions collaborators into already-linked members (added
 * to the org directly) vs unlinked invitees (invited by email), names/slugs the org from the shop,
 * and decides whether stamping `clerkOrgId` is safe THIS pass (only when no unlinked collaborator
 * remains — see {@link ShopBackfillPlan.stampClerkOrgId}).
 *
 * @param params - The shop's display name + domain and its collaborators (with `clerkUserId` presence).
 * @returns The deterministic backfill plan for the shop.
 */
export function planShopOrgBackfill(params: {
    shopName: string;
    domain: string;
    collaborators: PlannerCollaborator[];
}): ShopBackfillPlan {
    const members: PlannedMember[] = [];
    const invites: PlannedInvite[] = [];
    for (const collaborator of params.collaborators) {
        if (collaborator.clerkUserId) {
            members.push({ userId: collaborator.userId, email: collaborator.email, clerkUserId: collaborator.clerkUserId });
        } else {
            invites.push({ userId: collaborator.userId, email: collaborator.email });
        }
    }
    return {
        orgName: params.shopName,
        orgSlug: orgSlugFromDomain(params.domain),
        members,
        invites,
        stampClerkOrgId: invites.length === 0,
    };
}

/**
 * The planning query (spec Task 7.1 §1): lists every shop WITHOUT a `clerkOrgId` — the un-backfilled
 * set — each joined to its `shopCollaborators` → `users` rows so the runner sees, per collaborator,
 * the email and whether they already hold a Clerk account. System tier because this is migration
 * infrastructure reading across every tenant; internal-only, never client-callable.
 *
 * Bounded by the un-backfilled shop count (a one-time set that only shrinks), and each shop's
 * collaborator fan-out is its `by_shop` join — no unbounded cross-tenant scan of collaborator rows.
 *
 * @returns One {@link PendingBackfillShop} per un-backfilled shop, with its collaborators.
 */
export const pendingOrgBackfill = systemQuery({
    args: {},
    handler: async (ctx): Promise<PendingBackfillShop[]> => {
        const shops = await ctx.db.query('shops').collect();
        const pending: PendingBackfillShop[] = [];
        for (const shop of shops) {
            if (shop.clerkOrgId) {
                continue;
            }
            const collaboratorRows = await ctx.db
                .query('shopCollaborators')
                .withIndex('by_shop', (q) => q.eq('shop', shop._id))
                .collect();
            const collaborators: PendingBackfillCollaborator[] = [];
            for (const row of collaboratorRows) {
                const user = await ctx.db.get(row.user);
                if (!user) {
                    continue;
                }
                collaborators.push({ userId: user._id, email: user.email, hasClerkAccount: Boolean(user.clerkUserId) });
            }
            pending.push({ shopId: shop._id, name: shop.name, domain: shop.domain, collaborators });
        }
        return pending;
    },
});

/**
 * The slice of a mutation context the mirror writes touch: the raw writer/reader `db`. A `Pick` of
 * `GenericMutationCtx` so the projection helper can run from the system-tier mutations without
 * widening their context.
 */
type MirrorCtx = Pick<GenericMutationCtx<DataModel>, 'db'>;

/**
 * Upserts the `orgs` mirror row keyed on `clerkOrgId` (`orgs.by_clerk_org`). Idempotent: a re-run
 * patches the same row rather than inserting a duplicate. Mirrors the webhook's `upsertOrg`.
 *
 * @param ctx - A system-tier context exposing the raw `db`.
 * @param clerkOrgId - The Clerk organization id.
 * @param name - The org display name.
 * @param slug - The org slug.
 */
async function upsertOrgMirror(ctx: MirrorCtx, clerkOrgId: string, name: string, slug: string): Promise<void> {
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
 * Upserts an `orgMemberships` mirror row for the `(clerkOrgId, user)` pair (`by_clerk_org_user`).
 * Idempotent: a re-run patches role/subject on the existing row rather than inserting a duplicate.
 * Mirrors the webhook's `upsertMembership` write (without the user-resolution step — the backfill
 * already holds the linked `users` id and Clerk subject).
 *
 * @param ctx - A system-tier context exposing the raw `db`.
 * @param clerkOrgId - The Clerk organization id.
 * @param userId - The collaborator's `users` row id.
 * @param clerkUserId - The collaborator's Clerk subject.
 * @param role - The Clerk-assigned role string.
 */
async function upsertMembershipMirror(
    ctx: MirrorCtx,
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
 * Re-projects ONE user's `shopCollaborators` from their org memberships — the same fan-out the Clerk
 * webhook performs ({@link desiredCollaboratorRows} × {@link reconcileCollaboratorRows}), run inline
 * so the backfill produces the identical derived rows the shell's collaborator-based queries read.
 * Idempotent and order-independent. Reused from the webhook/seed pattern verbatim.
 *
 * @param ctx - A system-tier context exposing the raw `db`.
 * @param userId - The user whose projection is recomputed.
 */
async function projectUser(ctx: MirrorCtx, userId: Id<'users'>): Promise<void> {
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
 * Internal mutation (spec Task 7.1 §2): the IDEMPOTENT mirror writer for one shop's backfill. Given a
 * Clerk org id already find-or-created by the action, it upserts the `orgs` mirror, upserts an
 * `orgMemberships` row for each ALREADY-LINKED member, re-projects each member's `shopCollaborators`,
 * and — ONLY when `stampClerkOrgId` is true (no unlinked collaborator remains) — stamps
 * `shops.clerkOrgId`. This ordering is the lockout guarantee: the org + every provisionable member's
 * membership land BEFORE the stamp, so a shop is never left with `clerkOrgId` set but its
 * collaborators not yet members. Unlinked collaborators are NOT written here (they have no Clerk
 * subject); the action invites them and the shop stays deferred until a re-run.
 *
 * System tier: backfills are a sanctioned cross-tenant exemption. Internal-only, never client-callable.
 *
 * Idempotent end-to-end: re-running patches the org/membership rows in place and the projection
 * converges to the same set, so a duplicate org/membership/collaborator can never appear.
 *
 * @param shopId - The shop being backfilled.
 * @param clerkOrgId - The Clerk org id the action find-or-created for this shop.
 * @param orgName - The org display name to mirror.
 * @param orgSlug - The org slug to mirror.
 * @param members - The already-linked collaborators to mirror as members + project.
 * @param stampClerkOrgId - Whether to stamp `shops.clerkOrgId` this pass (lockout-safe gate).
 * @throws {ConvexError} `CLERK_BACKFILL_SHOP_NOT_FOUND` when the shop vanished mid-run.
 */
export const applyShopOrgBackfill = systemMutation({
    args: {
        shopId: v.id('shops'),
        clerkOrgId: v.string(),
        orgName: v.string(),
        orgSlug: v.string(),
        members: v.array(v.object({ userId: v.id('users'), clerkUserId: v.string(), role: v.string() })),
        stampClerkOrgId: v.boolean(),
    },
    handler: async (ctx, { shopId, clerkOrgId, orgName, orgSlug, members, stampClerkOrgId }) => {
        const shop = await ctx.db.get(shopId);
        if (!shop) {
            throw new ConvexError({
                code: BackfillErrorCode.SHOP_NOT_FOUND,
                message: `Shop ${shopId} vanished during backfill.`,
            });
        }

        await upsertOrgMirror(ctx, clerkOrgId, orgName, orgSlug);
        for (const member of members) {
            await upsertMembershipMirror(ctx, clerkOrgId, member.userId, member.clerkUserId, member.role);
        }

        if (!stampClerkOrgId) {
            // DEFERRED pass: the org + linked memberships are mirrored, but `clerkOrgId` is left unset
            // so the shop stays in its pre-Clerk, un-backfilled state (no `resolveShopAccess` lockout).
            // CRUCIALLY we do NOT re-project here: `projectUser` derives desired collaborators from
            // (membership × owned shops), and an un-stamped shop owns none — so projecting would DELETE
            // the linked member's existing pre-Clerk `shopCollaborators` row and lock them out of the
            // very shop we are deferring. The member keeps access through that pre-existing row until a
            // re-run stamps the shop (which then projects the row from the membership).
            return;
        }

        if (shop.clerkOrgId !== clerkOrgId) {
            await ctx.db.patch(shopId, { clerkOrgId, updatedAt: Date.now() });
        }

        // Re-project AFTER the stamp so each linked member gains the collaborator row for the now-owned
        // shop, derived from their membership — the same fan-out the webhook performs.
        for (const member of members) {
            await projectUser(ctx, member.userId);
        }
    },
});

/**
 * Internal mutation: the DEFERRED-completion stamp. Stamps `shops.clerkOrgId` (and re-projects each
 * member) for a shop whose org was mirrored on an earlier deferred pass but not stamped because an
 * unlinked collaborator remained. The action calls this on a re-run once every collaborator is a
 * linked member, completing the shop safely. The `members` it re-projects are the now-fully-linked
 * collaborators.
 *
 * Idempotent: re-running patches the same `clerkOrgId` and the projection converges to the same set.
 *
 * @param shopId - The shop to complete.
 * @param clerkOrgId - The Clerk org id (already mirrored) to stamp.
 * @param members - The linked collaborators to re-project after the stamp.
 * @throws {ConvexError} `CLERK_BACKFILL_SHOP_NOT_FOUND` when the shop vanished mid-run.
 */
export const stampShopClerkOrg = systemMutation({
    args: {
        shopId: v.id('shops'),
        clerkOrgId: v.string(),
        members: v.optional(v.array(v.id('users'))),
    },
    handler: async (ctx, { shopId, clerkOrgId, members }) => {
        const shop = await ctx.db.get(shopId);
        if (!shop) {
            throw new ConvexError({
                code: BackfillErrorCode.SHOP_NOT_FOUND,
                message: `Shop ${shopId} vanished during backfill stamp.`,
            });
        }
        if (shop.clerkOrgId !== clerkOrgId) {
            await ctx.db.patch(shopId, { clerkOrgId, updatedAt: Date.now() });
        }
        for (const userId of members ?? []) {
            await projectUser(ctx, userId);
        }
    },
});

/**
 * The per-shop outcome of a backfill run, reported back from {@link run} so the operator running the
 * migration sees exactly what happened to each shop.
 */
export interface ShopBackfillOutcome {
    shopId: Id<'shops'>;
    domain: string;
    clerkOrgId: string;
    orgCreated: boolean;
    membersAdded: number;
    invitationsSent: number;
    /** True when `clerkOrgId` was NOT stamped this pass because unlinked collaborators remain. */
    deferred: boolean;
}

/**
 * The Clerk-account collaborator with their REAL Clerk subject, resolved by {@link run} from the
 * `users` rows referenced in the planning query. The planning query exposes only presence
 * (`hasClerkAccount`) to keep its payload small; the action re-reads the subjects it needs.
 */
type ResolvedMember = { userId: Id<'users'>; clerkUserId: string; email: string };

/**
 * The ONE-TIME backfill action (spec Task 7.1 §2–3). For each shop missing `clerkOrgId`, idempotently:
 * find-or-create a Clerk Organization (slug from domain — the idempotency key), upsert the `orgs` +
 * `orgMemberships` mirrors and project `shopCollaborators` (so access is immediate for linked
 * operators), add Clerk-account collaborators as org members, invite the rest by email, and stamp
 * `shops.clerkOrgId` ONLY when no unlinked collaborator remains (the lockout-safe rule). Reports a
 * per-shop outcome.
 *
 * Runs server-side as an `internalAction` (never client-callable) so it can `fetch` the Clerk Backend
 * API. The HTTP client is built from `CLERK_SECRET_KEY` ({@link createClerkBackendClient}); the
 * idempotent mirror writes happen in {@link applyShopOrgBackfill} (unit-tested directly with no live
 * Clerk). It resolves each linked member's real Clerk subject from their `users` row through
 * {@link resolveLinkedMembers}.
 *
 * Invocation (runbook): `pnpm --filter @nordcom/commerce-convex convex:backfill clerk/backfill:run`
 * against a deployment whose env has `CLERK_SECRET_KEY` set (the dev or prod Clerk instance). NOT
 * client-callable.
 *
 * @returns The run summary: how many shops were processed, fully backfilled, and deferred.
 * @throws {ConvexError} `CLERK_BACKFILL_SECRET_KEY_UNCONFIGURED` when `CLERK_SECRET_KEY` is unset.
 */
export const run = internalAction({
    args: {},
    handler: async (ctx): Promise<{ processed: number; backfilled: number; deferred: number; outcomes: ShopBackfillOutcome[] }> => {
        const secretKey = getServerEnv('CLERK_SECRET_KEY');
        if (!secretKey) {
            throw new ConvexError({
                code: BackfillErrorCode.SECRET_KEY_UNCONFIGURED,
                message: 'CLERK_SECRET_KEY is not set on this deployment; the backfill cannot call the Clerk Backend API.',
            });
        }
        const client = createClerkBackendClient(secretKey);

        const pending: PendingBackfillShop[] = await ctx.runQuery(internal.clerk.backfill.pendingOrgBackfill, {});
        const outcomes: ShopBackfillOutcome[] = [];
        let deferredCount = 0;

        for (const shop of pending) {
            const resolved = await ctx.runQuery(internal.clerk.backfill.resolveLinkedMembers, {
                userIds: shop.collaborators.filter((c) => c.hasClerkAccount).map((c) => c.userId),
            });
            const members: ResolvedMember[] = resolved;

            const plan = planShopOrgBackfill({
                shopName: shop.name,
                domain: shop.domain,
                collaborators: shop.collaborators.map((collaborator) => ({
                    userId: collaborator.userId,
                    email: collaborator.email,
                    clerkUserId: members.find((m) => m.userId === collaborator.userId)?.clerkUserId,
                })),
            });

            const creator = members[0];
            if (!creator) {
                // No linked operator → cannot create a Clerk org (Clerk's create-org needs a `created_by`,
                // and org invitations need an org), so nothing can be provisioned for this shop yet. Leave
                // it un-backfilled (its current, access-equivalent state) and report it deferred so a human
                // signs in / links an operator for this shop, then re-runs. No invitations are sent here.
                outcomes.push({
                    shopId: shop.shopId,
                    domain: shop.domain,
                    clerkOrgId: '',
                    orgCreated: false,
                    membersAdded: 0,
                    invitationsSent: 0,
                    deferred: true,
                });
                deferredCount += 1;
                continue;
            }

            const org = await client.findOrCreateOrg({
                slug: plan.orgSlug,
                name: plan.orgName,
                createdByUserId: creator.clerkUserId,
            });

            for (const member of members) {
                await client.addMember({ organizationId: org.id, clerkUserId: member.clerkUserId, role: BACKFILL_ROLE });
            }
            for (const invite of plan.invites) {
                await client.invite({
                    organizationId: org.id,
                    email: invite.email,
                    inviterUserId: creator.clerkUserId,
                    role: BACKFILL_ROLE,
                });
            }

            await ctx.runMutation(internal.clerk.backfill.applyShopOrgBackfill, {
                shopId: shop.shopId,
                clerkOrgId: org.id,
                orgName: org.name,
                orgSlug: org.slug,
                members: members.map((member) => ({ userId: member.userId, clerkUserId: member.clerkUserId, role: BACKFILL_ROLE })),
                stampClerkOrgId: plan.stampClerkOrgId,
            });

            if (!plan.stampClerkOrgId) {
                deferredCount += 1;
            }
            outcomes.push({
                shopId: shop.shopId,
                domain: shop.domain,
                clerkOrgId: org.id,
                orgCreated: true,
                membersAdded: members.length,
                invitationsSent: plan.invites.length,
                deferred: !plan.stampClerkOrgId,
            });
        }

        return {
            processed: pending.length,
            backfilled: outcomes.filter((outcome) => outcome.orgCreated && !outcome.deferred).length,
            deferred: deferredCount,
            outcomes,
        };
    },
});

/**
 * Internal query: resolves the real Clerk subjects for a set of linked collaborators' `users` rows.
 * The planning query exposes only `hasClerkAccount` presence to keep its payload small; the action
 * needs each member's actual `clerkUserId` to add them to the org + write the membership mirror, so
 * it re-reads exactly the linked users here. System tier (platform-global `users`), internal-only.
 *
 * @param userIds - The linked collaborators' `users` row ids.
 * @returns Each resolvable user's id, Clerk subject, and email; rows missing a `clerkUserId` are skipped.
 */
export const resolveLinkedMembers = systemQuery({
    args: { userIds: v.array(v.id('users')) },
    handler: async (ctx, { userIds }): Promise<ResolvedMember[]> => {
        const resolved: ResolvedMember[] = [];
        for (const userId of userIds) {
            const user = await ctx.db.get(userId);
            if (user?.clerkUserId) {
                resolved.push({ userId: user._id, clerkUserId: user.clerkUserId, email: user.email });
            }
        }
        return resolved;
    },
});

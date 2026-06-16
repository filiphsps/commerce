import type { GenericActionCtx, GenericMutationCtx } from 'convex/server';
import { v } from 'convex/values';
import { Webhook } from 'svix';

import { internal } from '../_generated/api';
import type { DataModel, Id } from '../_generated/dataModel';
import { httpAction } from '../_generated/server';

import { getServerEnv } from '../lib/env';
import { systemMutation } from '../lib/system';
import { desiredCollaboratorRows, reconcileCollaboratorRows, type CollaboratorRow } from './sync';

/**
 * The subset of a Clerk webhook event this module reads. Clerk's envelope is `{ type, data }`; the
 * fields below are exactly the ones the user/org/membership handlers consume — every other claim on
 * the real payload is ignored. Modeled structurally (not imported from `@clerk/backend`) because the
 * Convex bundle deliberately ships no Clerk SDK, and `Webhook.verify` returns `unknown` anyway, so a
 * narrow local shape is the typed contract here. The `type` literal union is the dispatch key
 * {@link planWebhookActions} switches on.
 */
export type ClerkWebhookEvent = {
    type: string;
    data: ClerkWebhookEventData;
};

/**
 * The union of payload shapes carried on a Clerk webhook event's `data` for the events this module
 * handles. All fields are optional because a single structural type spans every event type; each
 * handler reads only the fields its `type` guarantees. `email_addresses` + `primary_email_address_id`
 * mirror Clerk's user payload (the primary address is selected by id); `public_user_data` is the
 * membership payload's embedded user snapshot — `user_id` (the Clerk subject) plus `identifier` (the
 * user's email), `first_name`/`last_name`, and `image_url`, which let a membership that arrives before
 * the `user.created` webhook link/provision the user by their REAL email instead of a placeholder.
 * `organization` is the membership payload's org.
 */
type ClerkWebhookEventData = {
    id?: string;
    deleted?: boolean;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string;
    primary_email_address_id?: string | null;
    email_addresses?: Array<{ id: string; email_address: string }>;
    name?: string;
    slug?: string;
    role?: string;
    organization?: { id: string; name?: string; slug?: string; image_url?: string };
    public_user_data?: {
        user_id: string;
        identifier?: string;
        first_name?: string | null;
        last_name?: string | null;
        image_url?: string;
    };
};

/**
 * The typed, side-effect-free intent a webhook event dispatches to. One variant per internal mutation
 * the httpAction can call, carrying exactly the args that mutation needs. Producing these as plain
 * data (rather than calling `ctx.runMutation` inline) is what makes the dispatch layer unit-testable
 * WITHOUT a real svix signature or a Convex backend: a test asserts the intents, the httpAction maps
 * them to `ctx.runMutation` calls.
 */
export type WebhookAction =
    | { kind: 'upsertUserFromClerk'; clerkUserId: string; email: string; name: string; avatar: string | undefined }
    | { kind: 'deleteUser'; clerkUserId: string }
    | { kind: 'upsertOrg'; clerkOrgId: string; name: string; slug: string; imageUrl: string | undefined }
    | { kind: 'deleteOrg'; clerkOrgId: string }
    | {
          kind: 'upsertMembership';
          clerkOrgId: string;
          clerkUserId: string;
          role: string;
          /** The member's email from `public_user_data.identifier`; links/provisions by real email when the user webhook lags. */
          email: string | undefined;
          /** The member's display name from `public_user_data` first/last; synced onto a linked/provisioned row. */
          name: string | undefined;
          /** The member's avatar from `public_user_data.image_url`; synced onto a linked/provisioned row. */
          avatar: string | undefined;
      }
    | { kind: 'deleteMembership'; clerkOrgId: string; clerkUserId: string };

/**
 * Selects the primary email address from a Clerk user payload: the `email_addresses` entry whose id
 * matches `primary_email_address_id`, falling back to the first address. Returns an empty string when
 * the payload carries no addresses (a user with no email cannot be mapped and is skipped upstream).
 *
 * @param data - The user event's `data`.
 * @returns The primary email address, or `''` when none is present.
 */
function primaryEmail(data: ClerkWebhookEventData): string {
    const addresses = data.email_addresses ?? [];
    const primary = addresses.find((address) => address.id === data.primary_email_address_id) ?? addresses[0];
    return primary?.email_address ?? '';
}

/**
 * Joins a Clerk user's first/last name into a single display name, trimming and collapsing the gap so
 * a missing half does not leave a stray space. Returns the email local-part as a last resort when both
 * names are absent, so a provisioned `users.name` is never empty. Shared by the user-event path (names
 * from the top-level payload) and the membership-snapshot path (names from `public_user_data`).
 *
 * @param firstName - The user's first name, if present.
 * @param lastName - The user's last name, if present.
 * @param email - The already-resolved email, used for the fallback display name.
 * @returns A non-empty display name.
 */
function displayName(firstName: string | null | undefined, lastName: string | null | undefined, email: string): string {
    const joined = [firstName, lastName].filter((part): part is string => Boolean(part)).join(' ').trim();
    if (joined.length > 0) {
        return joined;
    }
    const localPart = email.split('@')[0];
    return localPart && localPart.length > 0 ? localPart : email;
}

/**
 * Maps a verified Clerk webhook event to the ordered list of internal-mutation intents that sync it.
 *
 * This is the PURE dispatch core (spec Task 3.1): it reads only the event payload and returns plain
 * {@link WebhookAction} data, so it is unit-tested with fake events and no svix signature. The svix
 * verification in {@link clerkWebhook} is a thin shell that calls this and runs each intent as a
 * `ctx.runMutation`. An unhandled `type` yields no actions (the endpoint still answers 200 — Clerk
 * sends events this deployment does not subscribe to, and a 200 prevents needless retries).
 *
 * `user.*` events with no resolvable email yield no actions: a user with no email cannot be keyed onto
 * the `users` table, so it is skipped rather than provisioning an unkeyable row.
 *
 * @param event - The verified Clerk webhook event.
 * @returns The intents to apply, in order. Empty for unhandled types or unmappable payloads.
 */
export function planWebhookActions(event: ClerkWebhookEvent): WebhookAction[] {
    const { data } = event;
    switch (event.type) {
        case 'user.created':
        case 'user.updated': {
            const clerkUserId = data.id;
            if (!clerkUserId) {
                return [];
            }
            const email = primaryEmail(data);
            if (!email) {
                return [];
            }
            return [
                {
                    kind: 'upsertUserFromClerk',
                    clerkUserId,
                    email,
                    name: displayName(data.first_name, data.last_name, email),
                    avatar: data.image_url,
                },
            ];
        }
        case 'user.deleted': {
            return data.id ? [{ kind: 'deleteUser', clerkUserId: data.id }] : [];
        }
        case 'organization.created':
        case 'organization.updated': {
            const clerkOrgId = data.id;
            if (!clerkOrgId) {
                return [];
            }
            return [
                {
                    kind: 'upsertOrg',
                    clerkOrgId,
                    name: data.name ?? '',
                    slug: data.slug ?? '',
                    imageUrl: data.image_url,
                },
            ];
        }
        case 'organization.deleted': {
            return data.id ? [{ kind: 'deleteOrg', clerkOrgId: data.id }] : [];
        }
        case 'organizationMembership.created':
        case 'organizationMembership.updated': {
            const clerkOrgId = data.organization?.id;
            const member = data.public_user_data;
            const clerkUserId = member?.user_id;
            if (!clerkOrgId || !clerkUserId) {
                return [];
            }
            const email = member?.identifier?.trim() || undefined;
            return [
                {
                    kind: 'upsertMembership',
                    clerkOrgId,
                    clerkUserId,
                    role: data.role ?? 'org:member',
                    email,
                    name: email ? displayName(member?.first_name, member?.last_name, email) : undefined,
                    avatar: member?.image_url,
                },
            ];
        }
        case 'organizationMembership.deleted': {
            const clerkOrgId = data.organization?.id;
            const clerkUserId = data.public_user_data?.user_id;
            if (!clerkOrgId || !clerkUserId) {
                return [];
            }
            return [{ kind: 'deleteMembership', clerkOrgId, clerkUserId }];
        }
        default:
            return [];
    }
}

/**
 * The slice of a mutation context the projection touches: the raw writer/reader `db`. A `Pick` of the
 * `GenericMutationCtx` so the per-user projection can be invoked from any of the system-tier internal
 * mutations below without widening their context — a mutation's writer `db` satisfies it directly.
 */
type ProjectionCtx = Pick<GenericMutationCtx<DataModel>, 'db'>;

/**
 * Recomputes ONE user's projected `shopCollaborators` rows from the current state of their org
 * memberships, applying the create/delete delta. The core of the fan-out projection (spec Task 3.2,
 * decision #11): the DESIRED set is the union, over the user's `orgMemberships` (`by_user`), of every
 * shop each owning org owns (`shops.by_clerk_org`), each granted the `['admin']` baseline
 * (decision #13). The CURRENT set is read from `shopCollaborators.by_user`, and
 * {@link reconcileCollaboratorRows} computes the minimal `{ toCreate, toDelete }` to converge them.
 *
 * Idempotent and order-independent: it derives desired purely from present membership rows, so running
 * it twice — or after any membership/org delete — yields the same projected set. It NEVER touches
 * other users' collaborator rows ({@link reconcileCollaboratorRows} filters `current` to `userId`),
 * and it does NOT backfill collaborators on shop-creation-under-an-org — that is a shop-write concern
 * (a later task), not a Clerk webhook event.
 *
 * @param ctx - A system-tier context exposing the raw `db`.
 * @param userId - The `users` row whose projection is recomputed.
 * @returns Resolves once the user's `shopCollaborators` rows match the desired projection.
 */
async function projectUser(ctx: ProjectionCtx, userId: Id<'users'>): Promise<void> {
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
 * Domain of the synthetic email a user row is provisioned with when a membership lands before the
 * `user.created` webhook AND the membership payload carries no `identifier`. Reserved/invalid by
 * design (RFC 6761 `.invalid`) so it can never collide with a real address, and recognizable so
 * {@link upsertUserFromClerk}'s merge path can detect a placeholder row and collapse it onto the real
 * email row once that arrives.
 */
const SYNTHETIC_EMAIL_DOMAIN = '@clerk.invalid';

/**
 * The member snapshot a membership event carries about its user (from `public_user_data`): the real
 * email (`identifier`), display name, and avatar. Used by {@link resolveOrProvisionUser} to link or
 * provision the user by their REAL identity when the membership arrives before the `user.created`
 * webhook, so a legacy operator's existing email-keyed row is linked rather than shadowed by a
 * placeholder duplicate.
 */
type MemberSnapshot = {
    email: string | undefined;
    name: string | undefined;
    avatar: string | undefined;
};

/**
 * Re-points every `orgMemberships` row owned by `fromUserId` onto `toUserId` (preserving each row's
 * `clerkOrgId`/`role`/`clerkUserId`), skipping any org for which `toUserId` already has a membership
 * so the `(clerkOrgId, user)` uniqueness invariant holds. The membership-move half of the merge in
 * {@link upsertUserFromClerk}: when a placeholder row is collapsed onto the real-email row, its org
 * grants must follow so no collaborator access is lost.
 *
 * @param ctx - A system-tier context exposing the raw `db`.
 * @param fromUserId - The placeholder row whose memberships are moved.
 * @param toUserId - The surviving real-email row the memberships move onto.
 * @returns Resolves once every membership has been re-pointed or de-duplicated.
 */
async function repointMemberships(
    ctx: ProjectionCtx,
    fromUserId: Id<'users'>,
    toUserId: Id<'users'>,
): Promise<void> {
    const memberships = await ctx.db
        .query('orgMemberships')
        .withIndex('by_user', (q) => q.eq('user', fromUserId))
        .collect();
    for (const membership of memberships) {
        const existing = await ctx.db
            .query('orgMemberships')
            .withIndex('by_clerk_org_user', (q) => q.eq('clerkOrgId', membership.clerkOrgId).eq('user', toUserId))
            .first();
        if (existing) {
            // The destination already belongs to this org; drop the duplicate placeholder membership.
            await ctx.db.delete(membership._id);
        } else {
            await ctx.db.patch(membership._id, { user: toUserId });
        }
    }
}

/**
 * Resolves the `users` row a Clerk membership belongs to, linking or provisioning by the member's REAL
 * identity when the `user.created` webhook has not landed yet (membership-before-user ordering is not
 * guaranteed, spec Task 3.2 §5). Resolution order, chosen so NO ordering produces two rows sharing one
 * email:
 * 1. **Clerk subject** — `users.by_clerk_user_id` on `clerkUserId`; an already-linked row wins.
 * 2. **Real email** — when the membership snapshot carries `identifier`, `users.by_email` on it: a
 *    legacy operator's existing row is LINKED in place (stamp `clerkUserId`, sync name/avatar) instead
 *    of shadowed by a placeholder. This is the defect fix — the later `user.created` then subject-hits
 *    THIS row, not a duplicate.
 * 3. **Insert** — only when both miss. Insert with the REAL email (`identifier`) when present; fall
 *    back to a synthetic `<clerkUserId>@clerk.invalid` ONLY when the payload genuinely has no email,
 *    which {@link upsertUserFromClerk}'s merge path later collapses if a real email row appears.
 *
 * Chosen over skip-and-log because dropping the membership would silently lose a collaborator grant
 * until an unrelated event re-triggered the projection.
 *
 * @param ctx - A system-tier context exposing the raw `db`.
 * @param clerkUserId - The membership's Clerk user subject (`public_user_data.user_id`).
 * @param snapshot - The member's real email/name/avatar from `public_user_data`.
 * @returns The resolved, linked, or freshly-provisioned `users` row id.
 */
async function resolveOrProvisionUser(
    ctx: ProjectionCtx,
    clerkUserId: string,
    snapshot: MemberSnapshot,
): Promise<Id<'users'>> {
    const bySubject = await ctx.db
        .query('users')
        .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', clerkUserId))
        .first();
    if (bySubject) {
        return bySubject._id;
    }

    const now = Date.now();
    const email = snapshot.email?.trim();

    if (email) {
        const byEmail = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .first();
        if (byEmail) {
            await ctx.db.patch(byEmail._id, {
                clerkUserId,
                name: snapshot.name ?? byEmail.name,
                avatar: snapshot.avatar ?? byEmail.avatar,
                updatedAt: now,
            });
            return byEmail._id;
        }
    }

    return ctx.db.insert('users', {
        email: email ?? `${clerkUserId}@clerk.invalid`,
        name: snapshot.name ?? (email ? displayName(undefined, undefined, email) : clerkUserId),
        avatar: snapshot.avatar,
        emailVerified: null,
        identities: [],
        clerkUserId,
        createdAt: now,
        updatedAt: now,
    });
}

/**
 * Internal mutation: upserts a `users` row from a Clerk `user.created`/`user.updated` event. The
 * single upsert that BOTH links a pre-existing email-keyed operator AND provisions a brand-new one
 * (spec User provisioning). Resolution, subject-first with a collision-safe merge:
 * 1. **Subject hit** — a row already carries this `clerkUserId`. Normally it is patched in place. But
 *    when that row is a SYNTHETIC PLACEHOLDER (its email ends in `@clerk.invalid`, provisioned by a
 *    membership that lacked an `identifier`) AND a DIFFERENT row already holds the event's REAL email,
 *    the two are MERGED: the email row gains `clerkUserId`, the placeholder's `orgMemberships`
 *    re-point onto the email row, both projections reconcile, and the placeholder row is deleted —
 *    never leaving two rows sharing one email. Otherwise the subject row is patched with the email.
 * 2. **Email hit** — no subject row, but the `by_email` row exists: it is linked by stamping
 *    `clerkUserId`.
 * 3. **Insert** — neither exists: a new row.
 *
 * `name`/`avatar` are synced on every path. Written through the system tier because `users` is
 * platform-global. Idempotent: re-running the same event patches the same row, never a copy.
 *
 * @param clerkUserId - The Clerk user subject (`user_…`).
 * @param email - The user's primary email (the `by_email` link/insert key).
 * @param name - The user's display name.
 * @param avatar - The user's optional avatar URL.
 * @returns The surviving `users` row id (the email row when a merge occurred).
 */
export const upsertUserFromClerk = systemMutation({
    args: { clerkUserId: v.string(), email: v.string(), name: v.string(), avatar: v.optional(v.string()) },
    handler: async (ctx, { clerkUserId, email, name, avatar }) => {
        const now = Date.now();

        const bySubject = await ctx.db
            .query('users')
            .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', clerkUserId))
            .first();
        if (bySubject) {
            const subjectIsPlaceholder = bySubject.email.endsWith(SYNTHETIC_EMAIL_DOMAIN) && bySubject.email !== email;
            if (subjectIsPlaceholder) {
                const emailRow = await ctx.db
                    .query('users')
                    .withIndex('by_email', (q) => q.eq('email', email))
                    .first();
                if (emailRow && emailRow._id !== bySubject._id) {
                    // Collapse the placeholder onto the real-email row: move its grants, then delete it.
                    await ctx.db.patch(emailRow._id, { clerkUserId, name, avatar, updatedAt: now });
                    await repointMemberships(ctx, bySubject._id, emailRow._id);
                    await ctx.db.delete(bySubject._id);
                    await projectUser(ctx, emailRow._id);
                    // Reap collaborator rows the deleted placeholder still owned: projectUser reads
                    // only `by_user` indexes (never `ctx.db.get`), so for the now-deleted id it sees
                    // zero memberships, computes an empty desired set, and deletes the orphans.
                    await projectUser(ctx, bySubject._id);
                    return emailRow._id;
                }
            }
            await ctx.db.patch(bySubject._id, { email, name, avatar, updatedAt: now });
            return bySubject._id;
        }

        const byEmail = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .first();
        if (byEmail) {
            await ctx.db.patch(byEmail._id, { clerkUserId, name, avatar, updatedAt: now });
            return byEmail._id;
        }

        return ctx.db.insert('users', {
            email,
            name,
            avatar,
            emailVerified: null,
            identities: [],
            clerkUserId,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Internal mutation: handles a Clerk `user.deleted` event by CLEARING the row's `clerkUserId` rather
 * than deleting the user or cascading to its shop data (spec User provisioning). The operator row and
 * every `shopCollaborators`/`orgMemberships` grant survive so an admin's storefront data is never lost
 * when their Clerk account is removed; a re-created Clerk account re-links by email on its next
 * `user.created`. A no-op when no row carries the subject (delete arrived for an un-mirrored user).
 *
 * Idempotent: re-running on an already-cleared row finds no `by_clerk_user_id` match and does nothing.
 *
 * @param clerkUserId - The deleted Clerk user subject.
 * @returns Resolves once the row's `clerkUserId` is cleared (or there was nothing to clear).
 */
export const deleteUser = systemMutation({
    args: { clerkUserId: v.string() },
    handler: async (ctx, { clerkUserId }) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', clerkUserId))
            .first();
        if (user) {
            await ctx.db.patch(user._id, { clerkUserId: undefined, updatedAt: Date.now() });
        }
    },
});

/**
 * Internal mutation: upserts an `orgs` mirror row from a Clerk `organization.created`/`.updated`
 * event, keyed on `clerkOrgId` (`orgs.by_clerk_org`). Updates `name`/`slug`/`imageUrl` in place when
 * the org already exists, else inserts a new mirror row. Written through the system tier because
 * `orgs` is platform-global.
 *
 * Idempotent: a repeat event patches the same row rather than inserting a duplicate.
 *
 * @param clerkOrgId - The Clerk organization id (`org_…`).
 * @param name - The organization's display name.
 * @param slug - The organization's slug.
 * @param imageUrl - The organization's optional profile image URL.
 * @returns Resolves once the `orgs` mirror row reflects the event.
 */
export const upsertOrg = systemMutation({
    args: { clerkOrgId: v.string(), name: v.string(), slug: v.string(), imageUrl: v.optional(v.string()) },
    handler: async (ctx, { clerkOrgId, name, slug, imageUrl }) => {
        const now = Date.now();
        const existing = await ctx.db
            .query('orgs')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, { name, slug, imageUrl, updatedAt: now });
            return;
        }
        await ctx.db.insert('orgs', { clerkOrgId, name, slug, imageUrl, createdAt: now, updatedAt: now });
    },
});

/**
 * Internal mutation: handles a Clerk `organization.deleted` event by removing the `orgs` row and ALL
 * its `orgMemberships` (`by_clerk_org`), then RE-PROJECTING each formerly-affected user so their
 * `shopCollaborators` drop the deleted org's shops (spec Task 3.2). The affected user set is captured
 * from the memberships BEFORE they are deleted, and each user's projection is recomputed AFTER, so the
 * now-absent memberships no longer contribute shops. The org's shops themselves are left intact (a
 * shop's ownership is the app/backfill layer's concern, surfaced in the UI).
 *
 * Idempotent: a repeat event finds no org/memberships and the re-projection is a no-op.
 *
 * @param clerkOrgId - The deleted Clerk organization id.
 * @returns Resolves once the org, its memberships, and the affected projections are reconciled.
 */
export const deleteOrg = systemMutation({
    args: { clerkOrgId: v.string() },
    handler: async (ctx, { clerkOrgId }) => {
        const memberships = await ctx.db
            .query('orgMemberships')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
            .collect();
        const affectedUserIds = [...new Set(memberships.map((membership) => membership.user))];

        for (const membership of memberships) {
            await ctx.db.delete(membership._id);
        }

        const org = await ctx.db
            .query('orgs')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
            .first();
        if (org) {
            await ctx.db.delete(org._id);
        }

        for (const userId of affectedUserIds) {
            await projectUser(ctx, userId);
        }
    },
});

/**
 * Internal mutation: upserts an `orgMemberships` mirror row from a Clerk
 * `organizationMembership.created`/`.updated` event, then re-projects the affected user into
 * `shopCollaborators`. The membership's user is resolved (or lazily provisioned) by Clerk subject via
 * {@link resolveOrProvisionUser}, so the membership lands even if the user webhook has not. Uniqueness
 * of the `(clerkOrgId, user)` pair is enforced in this mutation through `by_clerk_org_user`: an
 * existing row is patched (role change) rather than duplicated. After the upsert the user's full
 * projection is recomputed so every shop the org owns is granted.
 *
 * When the user webhook has not landed, the member is linked/provisioned by their REAL email from the
 * `public_user_data` snapshot ({@link resolveOrProvisionUser}), so a legacy operator's existing
 * email-keyed row is linked rather than shadowed by a placeholder duplicate.
 *
 * Idempotent: re-running patches the same membership row and the projection converges to the same set.
 *
 * @param clerkOrgId - The Clerk organization id the membership belongs to.
 * @param clerkUserId - The member's Clerk user subject.
 * @param role - The Clerk-assigned role string (`org:admin`/`org:member`/…).
 * @param email - The member's real email from `public_user_data.identifier`, when present.
 * @param name - The member's display name from `public_user_data`, when present.
 * @param avatar - The member's avatar from `public_user_data.image_url`, when present.
 * @returns Resolves once the membership row and the user's projection reflect the event.
 */
export const upsertMembership = systemMutation({
    args: {
        clerkOrgId: v.string(),
        clerkUserId: v.string(),
        role: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, { clerkOrgId, clerkUserId, role, email, name, avatar }) => {
        const userId = await resolveOrProvisionUser(ctx, clerkUserId, { email, name, avatar });

        const existing = await ctx.db
            .query('orgMemberships')
            .withIndex('by_clerk_org_user', (q) => q.eq('clerkOrgId', clerkOrgId).eq('user', userId))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, { role, clerkUserId });
        } else {
            await ctx.db.insert('orgMemberships', {
                clerkOrgId,
                user: userId,
                clerkUserId,
                role,
                createdAt: Date.now(),
            });
        }

        await projectUser(ctx, userId);
    },
});

/**
 * Internal mutation: handles a Clerk `organizationMembership.deleted` event by removing the
 * `orgMemberships` row for the `(clerkOrgId, user)` pair, then re-projecting the affected user so
 * their `shopCollaborators` drop the now-unowned org's shops — while KEEPING the shops they still
 * reach through their other org memberships ({@link projectUser} derives desired from the surviving
 * memberships). The user is resolved by Clerk subject; a delete for an un-mirrored user is a no-op.
 *
 * Idempotent: re-running finds no membership and the re-projection converges to the same set.
 *
 * @param clerkOrgId - The Clerk organization id the membership was in.
 * @param clerkUserId - The departing member's Clerk user subject.
 * @returns Resolves once the membership is removed and the user's projection is reconciled.
 */
export const deleteMembership = systemMutation({
    args: { clerkOrgId: v.string(), clerkUserId: v.string() },
    handler: async (ctx, { clerkOrgId, clerkUserId }) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', clerkUserId))
            .first();
        if (!user) {
            return;
        }

        const membership = await ctx.db
            .query('orgMemberships')
            .withIndex('by_clerk_org_user', (q) => q.eq('clerkOrgId', clerkOrgId).eq('user', user._id))
            .first();
        if (membership) {
            await ctx.db.delete(membership._id);
        }

        await projectUser(ctx, user._id);
    },
});

/**
 * Maps one planned {@link WebhookAction} to its internal-mutation `ctx.runMutation` call. Factored out
 * of {@link clerkWebhook} so the action→mutation wiring is a single exhaustive switch, keeping the
 * httpAction a thin verification shell over {@link planWebhookActions}.
 *
 * @param ctx - The httpAction context exposing `runMutation`.
 * @param action - The planned intent to apply.
 * @returns Resolves once the corresponding internal mutation has run.
 */
async function runWebhookAction(
    ctx: Pick<GenericActionCtx<DataModel>, 'runMutation'>,
    action: WebhookAction,
): Promise<void> {
    switch (action.kind) {
        case 'upsertUserFromClerk':
            await ctx.runMutation(internal.clerk.webhooks.upsertUserFromClerk, {
                clerkUserId: action.clerkUserId,
                email: action.email,
                name: action.name,
                avatar: action.avatar,
            });
            return;
        case 'deleteUser':
            await ctx.runMutation(internal.clerk.webhooks.deleteUser, { clerkUserId: action.clerkUserId });
            return;
        case 'upsertOrg':
            await ctx.runMutation(internal.clerk.webhooks.upsertOrg, {
                clerkOrgId: action.clerkOrgId,
                name: action.name,
                slug: action.slug,
                imageUrl: action.imageUrl,
            });
            return;
        case 'deleteOrg':
            await ctx.runMutation(internal.clerk.webhooks.deleteOrg, { clerkOrgId: action.clerkOrgId });
            return;
        case 'upsertMembership':
            await ctx.runMutation(internal.clerk.webhooks.upsertMembership, {
                clerkOrgId: action.clerkOrgId,
                clerkUserId: action.clerkUserId,
                role: action.role,
                email: action.email,
                name: action.name,
                avatar: action.avatar,
            });
            return;
        case 'deleteMembership':
            await ctx.runMutation(internal.clerk.webhooks.deleteMembership, {
                clerkOrgId: action.clerkOrgId,
                clerkUserId: action.clerkUserId,
            });
    }
}

/**
 * The Convex httpAction backing `POST /clerk-webhooks`. A thin, fail-closed verification shell over
 * the pure {@link planWebhookActions} dispatch (spec Task 3.1): it reads the raw body + the
 * `svix-id`/`svix-timestamp`/`svix-signature` headers, verifies the signature with svix using
 * `CLERK_WEBHOOK_SIGNING_SECRET`, then runs each planned intent as an internal mutation.
 *
 * Fail-closed behavior:
 * - Unset signing secret → 500. The endpoint refuses to process unverifiable payloads rather than
 *   trusting an unsigned body, so a misconfigured deployment cannot be spoofed.
 * - Missing svix headers or a failed signature verification → 400. svix's `verify` throws on a bad or
 *   replayed signature; the try/catch maps that to a 400 so Clerk surfaces the rejection.
 * - Verified event → the dispatched mutations run and the endpoint answers 200 (also for unhandled
 *   event types, which yield no actions — a 200 prevents Clerk from retrying events we don't sync).
 *
 * @param ctx - The Convex httpAction context used to run the planned internal sync mutations.
 * @param request - The inbound Clerk webhook POST carrying the raw body + svix signature headers.
 * @returns A `Response`: 500 (unconfigured), 400 (bad/missing signature), or 200 (verified + applied).
 */
export const clerkWebhook = httpAction(async (ctx, request) => {
    const signingSecret = getServerEnv('CLERK_WEBHOOK_SIGNING_SECRET');
    if (!signingSecret) {
        return new Response('Webhook signing secret is not configured.', { status: 500 });
    }

    const body = await request.text();
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');
    if (!svixId || !svixTimestamp || !svixSignature) {
        return new Response('Missing svix signature headers.', { status: 400 });
    }

    let event: ClerkWebhookEvent;
    try {
        event = new Webhook(signingSecret).verify(body, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
        }) as ClerkWebhookEvent;
    } catch {
        return new Response('Invalid webhook signature.', { status: 400 });
    }

    const actions = planWebhookActions(event);
    for (const action of actions) {
        await runWebhookAction(ctx, action);
    }

    return new Response(null, { status: 200 });
});

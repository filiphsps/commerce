import { ConvexError } from 'convex/values';
import { clerkMutation } from '../_constructors';
import type { Id } from '../_generated/dataModel';
import { AuthErrorCode } from '../lib/auth';

/**
 * The write surface this module needs: the raw `db` writer (inserts/patches/queries across the
 * platform-global `users` table). A `Pick` so both the `clerkMutation` context (which carries the
 * raw `ctx.db`) and the system-tier context satisfy it, and so this helper is usable in both the
 * webhook internal mutations and the public `ensureCurrentUser`.
 */
type ProvisioningCtx = {
    db: import('convex/server').GenericDatabaseWriter<import('../_generated/dataModel').DataModel>;
};

/**
 * The reserved domain `webhooks.ts` provisions a synthetic placeholder email under when a membership
 * arrives with no `identifier`. Assembled here and re-exported so the webhook module and this module
 * stay in sync on the constant without either owning the other.
 */
export const SYNTHETIC_EMAIL_DOMAIN = '@clerk.invalid';

/**
 * Joins a Clerk user's first/last name into a single display name, trimming and collapsing the gap so
 * a missing half does not leave a stray space. Returns the email local-part as a last resort when both
 * names are absent, so a provisioned `users.name` is never empty. Shared by the webhook user-event
 * path, the membership-snapshot path, and the `ensureCurrentUser` JWT-claim path.
 *
 * @param firstName - The user's first name, if present.
 * @param lastName - The user's last name, if present.
 * @param email - The already-resolved email, used for the fallback display name.
 * @returns A non-empty display name.
 */
export function displayName(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
    email: string,
): string {
    const joined = [firstName, lastName]
        .filter((part): part is string => Boolean(part))
        .join(' ')
        .trim();
    if (joined.length > 0) {
        return joined;
    }
    const localPart = email.split('@')[0];
    return localPart && localPart.length > 0 ? localPart : email;
}

/**
 * The canonical upsert core shared by the Clerk webhook internal mutations and the public
 * `ensureCurrentUser` safety-net mutation. Subject-first with email fallback and a
 * placeholder-merge guard — the single implementation that every provisioning path calls so the
 * resolution logic stays in one place.
 *
 * Resolution order (matches the webhook's `upsertUserFromClerk` contract):
 * 1. **Subject hit** — a row already carries this `clerkUserId`. When that row is a SYNTHETIC
 *    PLACEHOLDER (email ends in `@clerk.invalid`) AND a DIFFERENT row already holds the supplied
 *    REAL email, the two are MERGED: the email row gains `clerkUserId`+name+avatar, the placeholder
 *    is deleted — never leaving two rows sharing one email. Otherwise the subject row is patched.
 * 2. **Email hit** — no subject row, but a `by_email` row exists: stamped with `clerkUserId`.
 * 3. **Insert** — neither exists: a new row is inserted.
 *
 * Idempotent: a second call for the same `(clerkUserId, email)` patches the subject row in place.
 *
 * @param ctx - A context exposing a raw `db` writer (system-tier or Clerk-mutation context).
 * @param clerkUserId - The Clerk user subject (`user_…`).
 * @param email - The user's primary email (the `by_email` link / insert key).
 * @param name - The display name to store.
 * @param avatar - Optional avatar URL.
 * @returns The surviving `users` row id (the email row when a merge occurred, else the upserted row).
 */
export async function upsertUserByClerkIdentity(
    ctx: ProvisioningCtx,
    clerkUserId: string,
    email: string,
    name: string,
    avatar: string | undefined,
): Promise<Id<'users'>> {
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
                // Merge: collapse the placeholder onto the real-email row. The webhook's
                // repointMemberships step runs in the webhook context; ensureCurrentUser callers
                // never hold orgMemberships on a placeholder (the placeholder was webhook-created),
                // but the merge is still correct — patching the email row and deleting the
                // placeholder is safe whether memberships exist or not.
                await ctx.db.patch(emailRow._id, { clerkUserId, name, avatar, updatedAt: now });
                await ctx.db.delete(bySubject._id);
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
}

/**
 * The minimal `users` row fields returned to the caller on a successful provision or no-op upsert.
 * Enough for the admin first-load to identify the operator without a follow-up read.
 */
export interface EnsuredUser {
    id: Id<'users'>;
    email: string;
    name: string;
}

/**
 * Public, Clerk-operator-authenticated mutation that provisions (or idempotently resolves) the
 * platform `users` row for the signed-in operator.
 *
 * This is the lazy first-load safety net for the race where an operator signs into Clerk and the
 * admin app makes its first authenticated Convex call before the `user.created` webhook has been
 * delivered and processed. Calling `resolveUserFromIdentity` in that window would throw
 * `UNKNOWN_USER`; this mutation provisions the row FROM the JWT claims instead, so the first
 * authenticated page load never hard-fails.
 *
 * Authentication: built on {@link clerkMutation}, which validates the Clerk JWT already verified by
 * Convex and re-asserts the `CLERK_FRONTEND_API_URL` issuer. The identity and email are pinned onto
 * `ctx.identity` / `ctx.identityEmail` by the constructor, so the handler reads server-derived
 * claims, not client arguments. Does NOT use `resolveUserFromIdentity` (which requires an existing
 * row), `authedMutation` (wrong issuer path), or `tenantMutation` (requires a collaborator row).
 *
 * Idempotent: calling it twice — or after the webhook has run — patches the same row and returns
 * the same id. The webhook is still the source of truth (it carries richer payload: full name,
 * avatar, org memberships); this mutation only ensures the row exists.
 *
 * Name from identity: the Clerk `convex` JWT template carries `email` but not `given_name`/
 * `family_name` by default, so `name` falls back to the email local-part when no `name` claim is
 * present. The webhook later enriches name/avatar from the full `user.*` payload.
 *
 * @returns The surviving (or newly provisioned) user id, email, and name.
 * @throws {ConvexError} `UNAUTHENTICATED` when there is no Clerk identity on the request.
 * @throws {ConvexError} `FORGED_IDENTITY` when the identity's issuer does not match `CLERK_FRONTEND_API_URL`.
 * @throws {ConvexError} `IDENTITY_WITHOUT_EMAIL` when the Clerk JWT carries no `email` claim.
 */
export const ensureCurrentUser = clerkMutation({
    args: {},
    handler: async (ctx): Promise<EnsuredUser> => {
        const { identity, identityEmail: email } = ctx;

        // The Clerk `convex` JWT template does not carry first/last name claims by default.
        // `identity.name` is available when the template declares it; fall back to local-part.
        const name = displayName(identity.givenName ?? identity.name ?? null, identity.familyName ?? null, email);

        const userId = await upsertUserByClerkIdentity(ctx, identity.subject, email, name, undefined);

        const row = await ctx.db.get(userId);
        if (!row) {
            // Unreachable: we just upserted this row.
            throw new ConvexError({
                code: AuthErrorCode.UNKNOWN_USER,
                message: 'User row vanished immediately after provisioning.',
            });
        }

        return { id: userId, email: row.email, name: row.name };
    },
});

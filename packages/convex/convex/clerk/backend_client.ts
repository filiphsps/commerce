/**
 * A minimal Clerk Backend REST client used by the one-time org backfill action. The Convex bundle
 * deliberately ships no `@clerk/backend` SDK (the webhook + provisioning paths model Clerk's shapes
 * structurally), so the few operations the backfill needs — find-or-create an org, add an existing
 * user as a member, invite by email — are a handful of typed `fetch` calls. Kept SEPARATE from the
 * e2e harness's `apps/admin/e2e/support/clerk-backend.ts` because that one runs in the Node/Playwright
 * runtime and this one runs inside a Convex `internalAction`; they share no module, only the same
 * Backend API contract. The HTTP transport is injectable ({@link ClerkBackendClient}) so the backfill
 * mutation logic is unit-tested without a live Clerk instance.
 */

import { ConvexError } from 'convex/values';

/** Clerk Backend REST base. */
const CLERK_API_BASE = 'https://api.clerk.com/v1';

/**
 * Stable {@link ConvexError} code raised when a Clerk Backend call fails for a non-idempotent reason,
 * so the backfill action surfaces a structured error rather than an opaque HTTP string.
 */
export const CLERK_BACKEND_ERROR = 'CLERK_BACKEND_API_ERROR';

/**
 * The slice of a Clerk Backend organization object the backfill consumes: the id stamped onto the
 * shop as `clerkOrgId`, plus the name/slug mirrored into the `orgs` table.
 */
export interface ClerkBackendOrg {
    id: string;
    name: string;
    slug: string;
}

/**
 * The transport surface the backfill depends on — the four Clerk Backend operations it performs,
 * each returning a normalized result. Modeled as an interface so a test can inject a fake that
 * records calls and returns canned ids, exercising the action's orchestration + the mutation logic
 * with NO network and NO live Clerk instance.
 */
export interface ClerkBackendClient {
    /**
     * Finds (or creates) a Clerk organization for the given slug, idempotently. Clerk has no
     * list-by-slug filter, so existence is probed via `GET /organizations/{slug}` (Clerk resolves an
     * org by id OR slug on that route); a miss creates one with `created_by`, which auto-adds the
     * creator as an `org:admin` member.
     *
     * @param params - The org slug (the idempotency key), display name, and the creating user.
     * @returns The org's Clerk id, name, and slug.
     */
    findOrCreateOrg(params: { slug: string; name: string; createdByUserId: string }): Promise<ClerkBackendOrg>;

    /**
     * Adds an existing Clerk user to an org as a member, tolerating an already-a-member response so a
     * re-run is a no-op. Returns whether a NEW membership was created (`true`) versus already present.
     *
     * @param params - The org id, the Clerk user id, and the role to assign.
     * @returns `true` when a membership was newly created; `false` when the user was already a member.
     */
    addMember(params: { organizationId: string; clerkUserId: string; role: string }): Promise<boolean>;

    /**
     * Creates an org invitation by email, tolerating a duplicate (already invited / already a member)
     * so a re-run is a no-op. Returns whether a NEW invitation was sent.
     *
     * @param params - The org id, the invitee email, the inviting user, and the role to grant on accept.
     * @returns `true` when an invitation was newly created; `false` when one already existed.
     */
    invite(params: {
        organizationId: string;
        email: string;
        inviterUserId: string;
        role: string;
    }): Promise<boolean>;
}

/** Raw Clerk organization shape (only the fields read here). */
type RawOrg = { id: string; name: string; slug: string };

/** A Clerk Backend API error body carries a machine-readable `code` per error entry. */
type ClerkErrorBody = { errors?: Array<{ code?: string }> };

/**
 * Extracts the first Clerk error `code` from a non-2xx response body, used to branch on the
 * idempotency-tolerant cases (already a member, duplicate invitation) without string-matching
 * human messages.
 *
 * @param body - The parsed error body text.
 * @returns The first error code, or `undefined` when the body carries none.
 */
function firstErrorCode(body: string): string | undefined {
    try {
        const parsed = JSON.parse(body) as ClerkErrorBody;
        return parsed.errors?.[0]?.code;
    } catch {
        return undefined;
    }
}

/**
 * Builds the live Clerk Backend client over `fetch`, authenticating every call with the deployment's
 * `CLERK_SECRET_KEY`. Used by the backfill action against a real (dev or prod) Clerk instance; unit
 * tests inject a fake {@link ClerkBackendClient} instead.
 *
 * @param secretKey - The Clerk secret key (read from the Convex deployment env by the action).
 * @returns A {@link ClerkBackendClient} bound to the Clerk Backend API.
 */
export function createClerkBackendClient(secretKey: string): ClerkBackendClient {
    /**
     * Issues one authenticated Clerk Backend request, returning `{ ok, status, body }` so callers can
     * branch on idempotency-tolerant error codes rather than always throwing.
     *
     * @param path - The API path under {@link CLERK_API_BASE}.
     * @param init - Optional method/body; `Authorization` + JSON `Content-Type` are added.
     * @returns The status and raw body text.
     */
    async function call(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: string }> {
        const response = await fetch(`${CLERK_API_BASE}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
                ...init.headers,
            },
        });
        return { ok: response.ok, status: response.status, body: await response.text() };
    }

    return {
        async findOrCreateOrg({ slug, name, createdByUserId }) {
            const probe = await call(`/organizations/${encodeURIComponent(slug)}`);
            if (probe.ok) {
                const found = JSON.parse(probe.body) as RawOrg;
                return { id: found.id, name: found.name, slug: found.slug };
            }
            if (probe.status !== 404) {
                throw new ConvexError({ code: CLERK_BACKEND_ERROR, message: `Clerk findOrCreateOrg probe failed: ${probe.status} ${probe.body}`, status: probe.status });
            }
            const created = await call('/organizations', {
                method: 'POST',
                body: JSON.stringify({ name, slug, created_by: createdByUserId }),
            });
            if (!created.ok) {
                throw new ConvexError({ code: CLERK_BACKEND_ERROR, message: `Clerk create organization failed: ${created.status} ${created.body}`, status: created.status });
            }
            const org = JSON.parse(created.body) as RawOrg;
            return { id: org.id, name: org.name, slug: org.slug };
        },

        async addMember({ organizationId, clerkUserId, role }) {
            const result = await call(`/organizations/${encodeURIComponent(organizationId)}/memberships`, {
                method: 'POST',
                body: JSON.stringify({ user_id: clerkUserId, role }),
            });
            if (result.ok) {
                return true;
            }
            // `already_a_member_in_organization` (422) means the membership already exists — a re-run no-op.
            if (firstErrorCode(result.body) === 'already_a_member_in_organization') {
                return false;
            }
            throw new ConvexError({ code: CLERK_BACKEND_ERROR, message: `Clerk add member failed: ${result.status} ${result.body}`, status: result.status });
        },

        async invite({ organizationId, email, inviterUserId, role }) {
            const result = await call(`/organizations/${encodeURIComponent(organizationId)}/invitations`, {
                method: 'POST',
                body: JSON.stringify({ email_address: email, inviter_user_id: inviterUserId, role }),
            });
            if (result.ok) {
                return true;
            }
            // `duplicate_record` means this email already has a pending invitation — a re-run no-op.
            if (firstErrorCode(result.body) === 'duplicate_record') {
                return false;
            }
            throw new ConvexError({ code: CLERK_BACKEND_ERROR, message: `Clerk org invitation failed: ${result.status} ${result.body}`, status: result.status });
        },
    };
}

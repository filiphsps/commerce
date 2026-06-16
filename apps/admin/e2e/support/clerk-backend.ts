import { ApiError, MissingEnvironmentVariableError } from '@nordcom/commerce-errors';

/**
 * Clerk Backend REST base. The harness talks to the Backend API directly (rather than pulling in
 * `@clerk/backend`) because the only operations it needs are find-or-create a test user + org; a
 * couple of typed `fetch` calls keep the dependency surface — and the bundle — minimal.
 */
const CLERK_API_BASE = 'https://api.clerk.com/v1';

/**
 * The slice of a Clerk Backend user object the harness consumes — the id used as the Convex
 * `clerkUserId` and the primary email for the seed's `by_email` link.
 */
export interface ClerkBackendUser {
    id: string;
    primaryEmail: string;
}

/**
 * The slice of a Clerk Backend organization object the harness consumes — the id used as the Convex
 * `clerkOrgId`, plus the display name/slug mirrored into the `orgs` table.
 */
export interface ClerkBackendOrg {
    id: string;
    name: string;
    slug: string;
}

/**
 * Reads the Clerk secret key, the credential every Backend API call authenticates with. Sourced from
 * the gitignored root `.env.local` (loaded by `pnpm test:e2e`'s dotenv) and the dev instance only.
 *
 * @returns The Clerk secret key.
 * @throws {MissingEnvironmentVariableError} When `CLERK_SECRET_KEY` is unset.
 */
function requireSecretKey(): string {
    const key = process.env.CLERK_SECRET_KEY;
    if (!key) {
        throw new MissingEnvironmentVariableError('CLERK_SECRET_KEY', 'Run via `pnpm test:e2e` so root .env.local loads.');
    }
    return key;
}

/**
 * Issues one authenticated Clerk Backend API request and returns its parsed JSON body, failing loud on
 * a non-2xx so a misconfigured key or a Clerk-side rejection surfaces at setup rather than as an opaque
 * sign-in failure later.
 *
 * @param path - The API path under {@link CLERK_API_BASE} (e.g. `/users`).
 * @param init - Optional fetch overrides (method, body); `Authorization` + JSON `Content-Type` are added.
 * @returns The parsed JSON response body.
 * @throws {ApiError} When Clerk answers a non-2xx status (the body is embedded as the cause).
 */
async function clerkFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${CLERK_API_BASE}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${requireSecretKey()}`,
            'Content-Type': 'application/json',
            ...init.headers,
        },
    });
    const text = await response.text();
    if (!response.ok) {
        throw new ApiError(`Clerk Backend API ${init.method ?? 'GET'} ${path} failed: ${response.status} ${text}`, response.status);
    }
    return (text ? JSON.parse(text) : {}) as T;
}

/** Raw Clerk user shape (only the fields read here). */
type RawUser = { id: string; email_addresses?: Array<{ id: string; email_address: string }>; primary_email_address_id?: string | null };
/** Raw Clerk organization shape (only the fields read here). */
type RawOrg = { id: string; name: string; slug: string };

/**
 * Selects the user's primary email (the entry matching `primary_email_address_id`, else the first),
 * falling back to the supplied email so the returned object always carries one.
 *
 * @param user - The raw Clerk user.
 * @param fallback - The email used to find/create the user, returned when the payload has none.
 * @returns The resolved primary email.
 */
function primaryEmailOf(user: RawUser, fallback: string): string {
    const addresses = user.email_addresses ?? [];
    const primary = addresses.find((a) => a.id === user.primary_email_address_id) ?? addresses[0];
    return primary?.email_address ?? fallback;
}

/**
 * Finds (or creates) a Clerk test user for the given email on the dev instance, idempotently. A
 * `+clerk_test` subaddress email is required so Clerk treats the user as a test identity. The lookup is
 * by exact `email_address`; a create skips the password requirement (the e2e signs in via
 * `clerk.signIn`, never a password) and sends a first/last name because the dev instance's user
 * requirements mandate them (a name-less create returns a `form_data_missing` 422).
 *
 * @param email - The reserved `+clerk_test` email to find or create.
 * @returns The user's Clerk id + primary email.
 * @throws {ApiError} When a Clerk Backend call fails.
 */
export async function ensureClerkUser(email: string): Promise<ClerkBackendUser> {
    const existing = await clerkFetch<RawUser[]>(`/users?email_address=${encodeURIComponent(email)}`);
    const found = existing[0];
    if (found) {
        return { id: found.id, primaryEmail: primaryEmailOf(found, email) };
    }

    const created = await clerkFetch<RawUser>('/users', {
        method: 'POST',
        body: JSON.stringify({
            email_address: [email],
            skip_password_requirement: true,
            first_name: 'E2E',
            last_name: 'Test',
        }),
    });
    return { id: created.id, primaryEmail: primaryEmailOf(created, email) };
}

/**
 * Finds (or creates) a Clerk organization with the given slug, owned by the supplied user, idempotently.
 * Clerk has no list-by-slug filter, so existence is probed via `GET /organizations/{slug}` (Clerk
 * resolves an org by id OR slug on that route); a miss creates one with `created_by`, which auto-adds the
 * creator as an `org:admin` member — the membership the Convex seed mirrors.
 *
 * @param slug - The org slug (the idempotency key; stable across runs for the primary operator).
 * @param name - The org display name to create with.
 * @param createdByUserId - The Clerk user id to set as the org creator/owner.
 * @returns The org's Clerk id, name, and slug.
 * @throws {ApiError} When a Clerk Backend call fails for a reason other than the not-found probe.
 */
export async function ensureClerkOrg(slug: string, name: string, createdByUserId: string): Promise<ClerkBackendOrg> {
    try {
        const found = await clerkFetch<RawOrg>(`/organizations/${encodeURIComponent(slug)}`);
        return { id: found.id, name: found.name, slug: found.slug };
    } catch (error) {
        // A 404 is the find-miss; any other status is a real failure and must propagate.
        if (!(error instanceof ApiError) || error.statusCode !== 404) {
            throw error;
        }
    }

    const created = await clerkFetch<RawOrg>('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name, slug, created_by: createdByUserId }),
    });
    return { id: created.id, name: created.name, slug: created.slug };
}

/**
 * Deletes a Clerk organization by id, tolerating an already-absent org (404) so spec teardown is
 * rerun-safe. Used by the onboarding spec to reap the throwaway org a fresh operator creates.
 *
 * @param orgId - The Clerk organization id to delete.
 * @throws {ApiError} When the delete fails for a reason other than not-found.
 */
export async function deleteClerkOrg(orgId: string): Promise<void> {
    try {
        await clerkFetch(`/organizations/${encodeURIComponent(orgId)}`, { method: 'DELETE' });
    } catch (error) {
        if (!(error instanceof ApiError) || error.statusCode !== 404) {
            throw error;
        }
    }
}

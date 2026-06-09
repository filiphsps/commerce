import { ConvexError, v } from 'convex/values';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';

import { mutation, query } from '../_generated/server';
import { getServerEnv } from './env';

/**
 * Compares two strings without leaking, through timing, WHERE they first differ. The length check is
 * an intentional early-out (a secret's length is not itself sensitive); the XOR accumulation over the
 * remaining characters runs in time independent of the contents, so a caller cannot binary-search the
 * secret byte by byte. The Convex isolate has no Node `crypto.timingSafeEqual`, hence this manual form.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns `true` only when both strings are identical.
 */
function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    let diff = 0;
    for (let index = 0; index < a.length; index += 1) {
        diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
    }
    return diff === 0;
}

/**
 * Fail-closed gate for the server-trust tier: admits the call ONLY when the presented `serverSecret`
 * matches the deployment's `CONVEX_SERVER_SECRET`. An unset deployment secret denies every call (so a
 * misconfigured deployment never silently grants cross-tenant access), and the comparison is
 * constant-time so the secret cannot be recovered by timing the rejection.
 *
 * @param provided - The secret supplied by the caller as the `serverSecret` argument.
 * @throws {ConvexError} `SERVER_SECRET_UNCONFIGURED` when the deployment has no `CONVEX_SERVER_SECRET`;
 *   `SERVER_SECRET_INVALID` when the presented secret does not match.
 */
function assertServerSecret(provided: string): void {
    const expected = getServerEnv('CONVEX_SERVER_SECRET');
    if (!expected) {
        throw new ConvexError({
            code: 'SERVER_SECRET_UNCONFIGURED',
            message: 'CONVEX_SERVER_SECRET is not set on the deployment; the server-trust tier is closed.',
        });
    }
    if (!constantTimeEqual(provided, expected)) {
        throw new ConvexError({ code: 'SERVER_SECRET_INVALID', message: 'Invalid server secret.' });
    }
}

/**
 * The shared-secret argument every {@link serverQuery} / {@link serverMutation} function requires. It is
 * consumed by the constructor and stripped from the handler's view, so a function body never sees — and
 * cannot accidentally persist or echo — the secret.
 */
const serverSecretArgs = { serverSecret: v.string() };

/**
 * Server-trusted, PUBLIC query constructor that exposes the RAW, cross-tenant `ctx.db` to an external
 * caller authenticated by a shared secret rather than a Convex auth identity.
 *
 * This is the third constructor tier, distinct from the other two on purpose:
 * - {@link tenantQuery} (lib/tenant.ts) is public but pins a tenant from the validated auth identity and
 *   RLS-scopes `ctx.db` to that one shop — the default for any identity-bearing client request.
 * - `systemQuery` (lib/system.ts) exposes the raw db but is built on `internalQuery`, so it is
 *   `"internal"` visibility — callable only from other Convex functions, NEVER over the wire.
 * - `serverQuery` is built on the PUBLIC `query` (so an external `ConvexHttpClient` CAN call it) yet must
 *   reach cross-tenant / pre-tenant rows, so it cannot be identity-scoped. It is gated instead by
 *   {@link assertServerSecret}: only a caller holding the server-only `CONVEX_SERVER_SECRET` is admitted.
 *
 * It exists for exactly one consumer: `packages/db`'s lazy, identity-less server `ConvexHttpClient`,
 * whose seam entry points run before or across tenants — `Shop.findByDomain` (hostname → shop in
 * storefront middleware, before any user identity), `findAll`, and the credentialed shop-resolution hot
 * path. The secret is server-only (never shipped to a browser, mirroring `CONVEX_REVALIDATE_SECRET`), so
 * the public exposure is safe; the constructor returns the raw `ctx` (un-RLS-wrapped `ctx.db`), making
 * cross-tenant reads possible by design. Do NOT use this for any identity-bearing request — that is what
 * {@link tenantQuery} is for; reaching for `serverQuery` from app code would hand cross-tenant data to a
 * request that should have been tenant-scoped.
 *
 * @throws {ConvexError} `SERVER_SECRET_UNCONFIGURED` / `SERVER_SECRET_INVALID` (see {@link assertServerSecret}).
 */
export const serverQuery = customQuery(query, {
    args: serverSecretArgs,
    input: async (...[, { serverSecret }]) => {
        assertServerSecret(serverSecret);
        return { ctx: {}, args: {} };
    },
});

/**
 * Server-trusted, PUBLIC mutation constructor — the write-side companion to {@link serverQuery}. Built on
 * the public `mutation` so an external `ConvexHttpClient` can call it, gated by the same shared-secret
 * {@link assertServerSecret} check, and exposing the RAW, cross-tenant `ctx.db`.
 *
 * Intended for `packages/db`'s identity-less server seam writes that are inherently pre-tenant or
 * cross-tenant (e.g. the Auth.js adapter writing platform-global `users`/`sessions`/`identities`, which
 * carry no shop foreign key). Every identity-bearing tenant write must use {@link tenantMutation}
 * instead; `serverMutation` is the deliberate, secret-guarded escape hatch, not a general writer.
 *
 * @throws {ConvexError} `SERVER_SECRET_UNCONFIGURED` / `SERVER_SECRET_INVALID` (see {@link assertServerSecret}).
 */
export const serverMutation = customMutation(mutation, {
    args: serverSecretArgs,
    input: async (...[, { serverSecret }]) => {
        assertServerSecret(serverSecret);
        return { ctx: {}, args: {} };
    },
});

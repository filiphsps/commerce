import type { FunctionReference } from 'convex/server';

/**
 * Wire name of the authenticated Convex query backing the account profile island
 * (`packages/convex/convex/account/profile.ts` → `get`, addressed in Convex's
 * `module/path:export` form). Referenced by NAME via `makeFunctionReference` —
 * the same seam `packages/db` uses — so the storefront needs no dependency on the
 * Convex package's generated `api` object.
 *
 * The lane map (spec §2.1) classifies `[domain]/[locale]/account` as Lane-2 with
 * the PROFILE as its Convex-backed data (users/sessions are Convex's system of
 * record; there is no orders table — Shopify-owned order data stays
 * advisory/static). The backend query this name addresses is the identity-derived
 * "my profile" read: zero client args (the identity comes from the validated JWT,
 * never a spoofable argument) returning the caller's profile or `null`.
 */
export const ACCOUNT_PROFILE_QUERY_NAME = 'account/profile:get';

/**
 * Read-only profile slice rendered by the account island. Doubles as the
 * server-derived snapshot shape (built from the trusted NextAuth session inside
 * the dynamic PPR hole) and the live Convex query's return shape, so the island
 * renders identically from either source — the load-bearing property of the
 * snapshot-then-live contract (spec §2.3).
 */
export type AccountProfileSnapshot = {
    id: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
};

/**
 * Typed reference for the authenticated account profile query: public
 * visibility (wire-callable with the customer's bearer JWT — never the
 * secret-guarded `serverQuery` tier, whose `serverSecret` argument must never be
 * serialized into a client-bound `Preloaded` handle), zero client args, and the
 * caller's profile (or `null`) as the result.
 */
export type AccountProfileQuery = FunctionReference<
    'query',
    'public',
    Record<string, never>,
    AccountProfileSnapshot | null
>;

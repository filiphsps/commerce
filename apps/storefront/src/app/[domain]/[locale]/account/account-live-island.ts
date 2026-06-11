import 'server-only';

import { fetchMutation, preloadQuery } from 'convex/nextjs';
import type { Preloaded } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import type { Session } from 'next-auth';
import {
    ACCOUNT_PROFILE_PROVISION_MUTATION_NAME,
    ACCOUNT_PROFILE_QUERY_NAME,
    type AccountProfileProvisionMutation,
    type AccountProfileProvisionResult,
    type AccountProfileQuery,
    type AccountProfileSnapshot,
} from '@/components/convex/account-profile-contract';
import { type ConvexCustomerClaims, mintConvexCustomerToken } from '@/utils/convex-token';

/**
 * Env values that flip the per-surface kill switch OFF. Anything else —
 * including the variable being unset — leaves the live island enabled, so the
 * switch is a deliberate operator action, never a default.
 */
const KILL_SWITCH_VALUES: ReadonlySet<string> = new Set(['0', 'false', 'off', 'disabled']);

/**
 * Reads the SFREAD-08 per-surface kill switch for the account live island.
 * When killed, the server parent renders the read-only session snapshot WITHOUT
 * calling `preloadQuery` and without mounting the live client module, so the
 * downgrade also sheds the island chunk and the WebSocket — not just the UI.
 *
 * @param env - Environment to read (injectable for tests); defaults to `process.env`.
 * @returns `true` when `STOREFRONT_ACCOUNT_LIVE_ISLAND` is set to a kill value (`0`/`false`/`off`/`disabled`, case-insensitive).
 */
export function isAccountLiveIslandKilled(env: NodeJS.ProcessEnv = process.env): boolean {
    const flag = env.STOREFRONT_ACCOUNT_LIVE_ISLAND?.trim().toLowerCase();
    return flag !== undefined && KILL_SWITCH_VALUES.has(flag);
}

/**
 * Projects the trusted NextAuth session onto the island's profile shape — the
 * read-only snapshot every degraded branch (kill switch, no token, auth
 * failure, socket down) renders. Derived exclusively from the server-side
 * session, never from client input.
 *
 * @param session - The authenticated customer session from `getAuthSession`.
 * @returns The profile snapshot with absent fields normalized to `null`.
 */
export function toAccountProfileSnapshot(session: Session): AccountProfileSnapshot {
    const user = session.user;
    return {
        id: user?.id ?? null,
        name: user?.name ?? null,
        email: user?.email ?? null,
        image: user?.image ?? null,
    };
}

/**
 * Mints the Convex-validatable RS256 bearer JWT for an authenticated customer —
 * the storefront analog of the admin's injected `ConvexTokenMinter`
 * (`apps/admin/src/lib/convex-auth.ts`). Returning `null` means "no token can
 * be issued" and downgrades the surface to the read-only snapshot.
 */
export type ConvexCustomerTokenMinter = (customer: ConvexCustomerClaims) => Promise<string | null>;

/**
 * Default {@link ConvexCustomerTokenMinter}: signs the customer's RS256 JWT
 * in-process via {@link mintConvexCustomerToken} — this module already runs
 * server-side inside the dynamic PPR hole, so it shares the signing key with
 * the `/api/auth/convex-token/` endpoint (the browser fetcher's mint path)
 * instead of round-tripping its own HTTP route. Returns `null` whenever
 * `CONVEX_AUTH_PRIVATE_KEY`/`CONVEX_AUTH_ISSUER`/`CONVEX_AUTH_APPLICATION_ID`
 * are unconfigured or signing fails, downgrading the surface to the read-only
 * snapshot by contract.
 *
 * @param customer - The session-derived customer identity to mint for.
 * @returns The signed JWT, or `null` when no token can be issued.
 */
export const mintAccountConvexToken: ConvexCustomerTokenMinter = async (customer) => mintConvexCustomerToken(customer);

/**
 * The `preloadQuery` slice {@link preloadAccountProfile} consumes, narrowed to
 * the account profile query so tests can inject a spy without pulling the
 * Convex HTTP client.
 */
export type AccountProfilePreloader = (
    query: AccountProfileQuery,
    args: Record<string, never>,
    options: { token: string },
) => Promise<Preloaded<AccountProfileQuery>>;

/**
 * Builds the typed reference for the authenticated account profile query by
 * wire name — the same `makeFunctionReference` seam `packages/db` uses, so the
 * storefront stays decoupled from the Convex package's generated `api` object.
 *
 * @returns The {@link AccountProfileQuery} reference for `account/profile:get`.
 */
export function accountProfileQueryReference(): AccountProfileQuery {
    return makeFunctionReference<'query', Record<string, never>, AccountProfileSnapshot | null>(
        ACCOUNT_PROFILE_QUERY_NAME,
    );
}

/**
 * Builds the typed reference for the first-visit provisioning mutation by wire
 * name — the companion to {@link accountProfileQueryReference}.
 *
 * @returns The {@link AccountProfileProvisionMutation} reference for `account/profile:provision`.
 */
export function accountProfileProvisionReference(): AccountProfileProvisionMutation {
    return makeFunctionReference<'mutation', Record<string, never>, AccountProfileProvisionResult>(
        ACCOUNT_PROFILE_PROVISION_MUTATION_NAME,
    );
}

/**
 * The `fetchMutation` slice {@link preloadAccountProfile} uses to provision the
 * customer's `users` row, narrowed to the provisioning mutation so tests can
 * inject a spy without pulling the Convex HTTP client.
 */
export type AccountProfileProvisioner = (
    mutation: AccountProfileProvisionMutation,
    args: Record<string, never>,
    options: { token: string },
) => Promise<AccountProfileProvisionResult>;

/**
 * Runs `preloadQuery` for the account profile island — STRICTLY inside the
 * dynamic PPR hole. This module reads the per-request session and env, so it
 * must never be imported into a `'use cache'` scope (the account page's cached
 * `AccountShell` takes the dynamic subtree as `children`; this is called from
 * `AccountSession`, which marks itself dynamic via `await connection()` first).
 *
 * Fail-closed to the snapshot at every step: kill switch on, no deployment URL,
 * a session without an email, no mintable token, or `preloadQuery` itself
 * throwing (Convex rejecting the token — the auth-failure branch) all return
 * `null`, which the server parent renders as the read-only snapshot without
 * mounting the live client module. Errors are deliberately swallowed: degrading
 * to the snapshot IS the SFREAD-08 contract, not a failure to surface.
 *
 * Once a token has been minted — the AUTHENTICATED branch, and only there —
 * the customer's platform `users` row is provisioned first (idempotent,
 * claims-derived; storefront customers have no Auth.js adapter to create it),
 * so the genuine first visit upgrades to live instead of bouncing off
 * `UNKNOWN_USER`. A provisioning failure is swallowed and the preload still
 * decides the outcome: if the row exists anyway the island goes live, and if
 * not the preload's own rejection degrades to the snapshot as before. Every
 * unauthenticated/degraded branch above returns BEFORE provisioning, so no
 * row is ever created for a request that could not mint a valid token.
 *
 * @param session - The authenticated customer session.
 * @param overrides - Injectable seams for tests: the token minter, the provisioner, the preloader, and the env.
 * @returns The serializable `Preloaded` handle for the island, or `null` to render snapshot-only.
 */
export async function preloadAccountProfile(
    session: Session,
    overrides: {
        mint?: ConvexCustomerTokenMinter;
        provision?: AccountProfileProvisioner;
        preload?: AccountProfilePreloader;
        env?: NodeJS.ProcessEnv;
    } = {},
): Promise<Preloaded<AccountProfileQuery> | null> {
    const {
        mint = mintAccountConvexToken,
        provision = fetchMutation,
        preload = preloadQuery,
        env = process.env,
    } = overrides;

    if (isAccountLiveIslandKilled(env)) {
        return null;
    }
    if (!env.NEXT_PUBLIC_CONVEX_URL) {
        return null;
    }

    const email = session.user?.email?.trim();
    if (!email) {
        return null;
    }

    const token = await mint({
        email,
        name: session.user?.name ?? null,
        id: session.user?.id ?? null,
        image: session.user?.image ?? null,
    });
    if (!token) {
        return null;
    }

    try {
        await provision(accountProfileProvisionReference(), {}, { token });
    } catch {
        // Deliberate: the preload below is the decider. A transient provisioning failure must not
        // downgrade a customer whose row already exists, and a missing row fails the preload anyway.
    }

    try {
        return await preload(accountProfileQueryReference(), {}, { token });
    } catch {
        return null;
    }
}

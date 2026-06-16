import 'server-only';

import { convexIdentityMutation, convexIdentityQuery } from '@nordcom/commerce-db';

import { getAuthenticatedConvexClient } from './clerk-convex-token';

/**
 * The read-only summary of a linked OAuth identity the account page renders. Mirrors the Convex
 * `AccountIdentity` wire shape.
 */
export interface AccountIdentity {
    provider: string;
    identity: string;
    createdAt: number;
}

/**
 * The caller's own account view — the wire shape of `account/self:get` / `account/self:update`.
 */
export interface AccountSelf {
    name: string;
    email: string;
    emailVerified: number | null;
    createdAt: number;
    theme: 'dark' | 'system';
    identities: AccountIdentity[];
}

/**
 * Reads the current operator's own account view on a fresh Clerk-authenticated client.
 *
 * @returns The caller's {@link AccountSelf}.
 * @throws {ConvexOperatorTokenMintError} When there is no authenticated Clerk operator or no
 *   `convex`-template token can be issued.
 */
export async function getOwnAccount(): Promise<AccountSelf> {
    const client = await getAuthenticatedConvexClient();
    return convexIdentityQuery<AccountSelf>(client, 'account/self:get', {});
}

/**
 * Updates the current operator's own name and/or theme preference. Absent fields are omitted from the
 * wire args (Convex rejects explicit `undefined`).
 *
 * @param args - The new display name and/or theme.
 * @returns The fresh {@link AccountSelf} after the patch.
 * @throws {ConvexOperatorTokenMintError} When there is no authenticated Clerk operator or no
 *   `convex`-template token can be issued.
 */
export async function updateOwnAccount(args: { name?: string; theme?: 'dark' | 'system' }): Promise<AccountSelf> {
    const client = await getAuthenticatedConvexClient();
    const wireArgs: Record<string, unknown> = {
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.theme !== undefined ? { theme: args.theme } : {}),
    };
    return convexIdentityMutation<AccountSelf>(client, 'account/self:update', wireArgs);
}

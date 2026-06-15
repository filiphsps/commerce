import 'server-only';

import { convexIdentityMutation, convexIdentityQuery, createConvexIdentityClient } from '@nordcom/commerce-db';
import { ConvexOperatorTokenMintError } from '@nordcom/commerce-errors';

import { authenticateConvexClient, type ConvexOperatorIdentity } from './convex-auth';
import { isOperatorTokenMintingConfigured, mintConvexOperatorToken } from './convex-token';

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
 * Minter for the account seam: the seam is tenant-less, so the operator identity is signed as-is (no
 * active-shop claim).
 *
 * @param operator - The session-derived operator identity.
 * @returns The signed compact JWT, or `null` when minting is unconfigured/fails.
 */
const mintAccountToken = (operator: ConvexOperatorIdentity) => mintConvexOperatorToken(operator);

/**
 * Builds the mint-failure error, upgrading the message when the cause is an unconfigured minter.
 *
 * @param context - The Convex function path that needed the token.
 * @returns The error to throw.
 */
function mintError(context: string): ConvexOperatorTokenMintError {
    if (!isOperatorTokenMintingConfigured()) {
        return new ConvexOperatorTokenMintError(
            `${context} — operator token minting is not configured; set CONVEX_AUTH_PRIVATE_KEY (plus CONVEX_AUTH_ISSUER / CONVEX_AUTH_APPLICATION_ID), see apps/admin/.env.example`,
        );
    }
    return new ConvexOperatorTokenMintError(context);
}

/**
 * Reads the current operator's own account view on a fresh identity-authenticated client.
 *
 * @returns The caller's {@link AccountSelf}.
 * @throws {ConvexOperatorTokenMintError} When no operator token can be minted (unauthenticated or
 *   unconfigured RS256 material).
 */
export async function getOwnAccount(): Promise<AccountSelf> {
    const client = createConvexIdentityClient();
    const token = await authenticateConvexClient(client, mintAccountToken);
    if (!token) {
        throw mintError('account/self:get');
    }
    return convexIdentityQuery<AccountSelf>(client, 'account/self:get', {});
}

/**
 * Updates the current operator's own name and/or theme preference. Absent fields are omitted from the
 * wire args (Convex rejects explicit `undefined`).
 *
 * @param args - The new display name and/or theme.
 * @returns The fresh {@link AccountSelf} after the patch.
 * @throws {ConvexOperatorTokenMintError} When no operator token can be minted.
 */
export async function updateOwnAccount(args: { name?: string; theme?: 'dark' | 'system' }): Promise<AccountSelf> {
    const client = createConvexIdentityClient();
    const token = await authenticateConvexClient(client, mintAccountToken);
    if (!token) {
        throw mintError('account/self:update');
    }
    const wireArgs: Record<string, unknown> = {
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.theme !== undefined ? { theme: args.theme } : {}),
    };
    return convexIdentityMutation<AccountSelf>(client, 'account/self:update', wireArgs);
}

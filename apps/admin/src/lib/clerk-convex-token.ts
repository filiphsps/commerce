import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { createConvexIdentityClient } from '@nordcom/commerce-db';
import { ConvexOperatorTokenMintError } from '@nordcom/commerce-errors';
import type { ConvexHttpClient } from 'convex/browser';

/**
 * Builds a fresh, Clerk-authenticated Convex HTTP client for the current admin operator.
 *
 * Replaces the legacy RS256 minting seam (`convex-token.ts` + `convex-auth.ts`): instead of signing
 * a bespoke operator JWT, it asks Clerk for a token from the `convex` JWT template
 * (`getToken({ template: 'convex' })`) and attaches it via `setAuth`. The token authenticates against
 * the Clerk provider declared in `packages/convex/convex/auth.config.ts`, whose `lib/auth.ts`
 * resolves the operator by Clerk subject (`clerkUserId`) with an email-claim fallback.
 *
 * Gates strictly on the server-trusted Clerk session, never a client-supplied value: with no
 * authenticated operator (no `userId`) or no mintable template token it throws rather than returning
 * an unauthenticated client, so a request can never silently fall through to an identity-less Convex
 * call. A fresh client is constructed per call (never the shared module client) so a per-request
 * operator token can never leak across operators.
 *
 * The minted token is set only on this server-side `ConvexHttpClient` and never crosses to a client
 * component, so it needs no `experimental_taintUniqueValue` guard.
 *
 * @returns A `ConvexHttpClient` carrying the operator's Clerk-issued bearer token.
 * @throws {ConvexOperatorTokenMintError} When there is no authenticated Clerk operator, or Clerk
 *   could not issue a `convex`-template token for the session.
 * @throws {MissingEnvironmentVariableError} When neither `CONVEX_URL` nor `NEXT_PUBLIC_CONVEX_URL`
 *   is set (from {@link createConvexIdentityClient}).
 */
export async function getAuthenticatedConvexClient(): Promise<ConvexHttpClient> {
    const { userId, getToken } = await auth();
    if (!userId) {
        throw new ConvexOperatorTokenMintError('no authenticated Clerk operator session');
    }

    const token = await getToken({ template: 'convex' });
    if (!token) {
        throw new ConvexOperatorTokenMintError('Clerk could not issue a convex-template token');
    }

    const client = createConvexIdentityClient();
    client.setAuth(token);
    return client;
}

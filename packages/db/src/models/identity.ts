import type { BaseDocument } from '../db';

/**
 * Document shape for an OAuth provider link attached to a user. Stores the provider name, the
 * provider-scoped identity ID, optional token fields, and the token expiry date. Lives as an element
 * of the embedded `users.identities[]` array — the standalone NextAuth-era `identities` table was
 * dropped after the Clerk auth migration; the per-user embedded list is the surviving home for a
 * user's OAuth provider links.
 *
 * @example
 * ```ts
 * import type { IdentityBase } from '@nordcom/commerce-db';
 * function isExpired(identity: IdentityBase): boolean {
 *     return identity.expiresAt != null && identity.expiresAt < new Date();
 * }
 * ```
 */
export type IdentityBase = BaseDocument & {
    provider: string;
    identity: string;
    scope?: string;
    expiresAt?: Date;
    refreshToken?: string;
    accessToken?: string;
};

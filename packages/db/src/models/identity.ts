import type { BaseDocument } from '../db';

/**
 * Document shape for an OAuth provider link attached to a user. Stores the provider name, the
 * provider-scoped identity ID, optional token fields, and the token expiry date. `(provider,
 * identity)` is unique — GitHub user `42` and a future Google user `42` must not collide — and that
 * uniqueness is enforced inside the Convex `db/identities:upsertByProviderIdentity` mutation (the
 * migrated form of the old Mongo unique index).
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

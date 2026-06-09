import type { BaseDocument } from '../db';
import type { IdentityBase } from './identity';

/**
 * Document shape for a platform user. Carries an embedded list of OAuth identities and satisfies
 * the NextAuth adapter contract — specifically the optional `avatar` and nullable `emailVerified`
 * fields that the adapter reads after `User.create` and `User.find`. `email` is unique; the
 * constraint is enforced inside the Convex `db/users:create` mutation (the migrated form of the old
 * Mongo unique index).
 *
 * @example
 * ```ts
 * import type { UserBase } from '@nordcom/commerce-db';
 * function displayName(user: UserBase): string {
 *     return user.name;
 * }
 * ```
 */
export type UserBase = BaseDocument & {
    email: string;
    name: string;
    identities: IdentityBase[];
    avatar?: string;
    emailVerified: Date | null;
    groups?: string[];
};

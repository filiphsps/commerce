import type { BaseDocument } from '../db';
import type { UserBase } from './user';

/**
 * Document shape for an authenticated session. Pairs a bearer token with an expiry date and a
 * reference to the owning user. `user` is always the populated `UserBase` shape; the underlying
 * Convex `users` reference is resolved server-side and never surfaced.
 *
 * @example
 * ```ts
 * import type { SessionBase } from '@nordcom/commerce-db';
 * function isActive(session: SessionBase): boolean {
 *     return session.expiresAt > new Date();
 * }
 * ```
 */
export type SessionBase = BaseDocument & {
    user: UserBase;
    token: string;
    expiresAt: Date;
};

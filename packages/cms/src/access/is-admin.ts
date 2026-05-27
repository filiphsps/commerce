import type { Access } from 'payload';

/**
 * Shape of the authenticated CMS user stored in the `users` Payload collection.
 * Every Payload access predicate receives this via `req.user`.
 *
 * @example
 *   const isAdminUser = (user: CmsUser) => user.role === 'admin';
 */
export type CmsUser = {
    role: 'admin' | 'editor';
    tenants?: Array<{ tenant: string }>;
};

/**
 * Payload access predicate that passes only when the requesting user has the
 * `admin` role. Used on delete operations and admin-only collections.
 *
 * @param req - Payload access argument containing the authenticated user.
 * @returns `true` when the user is an admin, `false` otherwise.
 *
 * @example
 *   delete: isAdmin
 */
export const isAdmin: Access<CmsUser> = ({ req }) => {
    return req?.user?.role === 'admin';
};

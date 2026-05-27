import type { Access } from 'payload';
import { extractTenantIds } from './tenant-id-of';

/**
 * Payload access predicate for tenant-scoped collections that support drafts.
 * Unauthenticated callers see only published documents; admins see all; editors
 * are filtered to their assigned tenants. No-tenant editors see nothing.
 *
 * @param req - Payload access argument with optional `req.user`.
 * @returns `true` (unrestricted), `false` (denied), or a Payload where-clause.
 *
 * @example
 *   read: tenantScopedRead
 */
export const tenantScopedRead: Access = ({ req }) => {
    if (!req?.user) return { _status: { equals: 'published' } } as never;
    if (req.user.role === 'admin') return true;
    const tenantIds = extractTenantIds(req.user as never);
    if (tenantIds.length === 0) return false;
    return { tenant: { in: tenantIds } } as never;
};

/**
 * Payload access predicate that permits write operations to any authenticated
 * user who has at least one tenant assignment. Admins bypass the filter;
 * unauthenticated callers and no-tenant editors are rejected.
 *
 * @param req - Payload access argument with optional `req.user`.
 * @returns `true`, `false`, or a tenant-scoped where-clause.
 *
 * @example
 *   update: tenantScopedWrite
 */
export const tenantScopedWrite: Access = ({ req }) => {
    if (!req?.user) return false;
    if (req.user.role === 'admin') return true;
    const tenantIds = extractTenantIds(req.user as never);
    return tenantIds.length > 0 ? ({ tenant: { in: tenantIds } } as never) : false;
};

/**
 * Payload access predicate that restricts an operation to admin-role users only.
 * Used on delete operations and collections that must not be editable by editors.
 *
 * @param req - Payload access argument containing the authenticated user.
 * @returns `true` when the user has the `admin` role, `false` otherwise.
 *
 * @example
 *   delete: adminOnly
 */
export const adminOnly: Access = ({ req }) => req?.user?.role === 'admin';

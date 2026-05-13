import type { Access } from 'payload';
import { extractTenantIds } from './tenant-id-of';

/**
 * Standard tenant-scoped access pattern for content collections that also support drafts:
 *   - public (no user)     -> only published docs
 *   - admin user           -> sees everything
 *   - editor with tenants  -> sees their tenants
 *   - editor without tenants -> sees nothing
 */
export const tenantScopedRead: Access = ({ req }) => {
    if (!req?.user) return { _status: { equals: 'published' } } as never;
    if (req.user.role === 'admin') return true;
    const tenantIds = extractTenantIds(req.user as never);
    if (tenantIds.length === 0) return false;
    return { tenant: { in: tenantIds } } as never;
};

/** Write access: any logged-in user with at least one tenant assignment. */
export const tenantScopedWrite: Access = ({ req }) => {
    if (!req?.user) return false;
    if (req.user.role === 'admin') return true;
    const tenantIds = extractTenantIds(req.user as never);
    return tenantIds.length > 0 ? ({ tenant: { in: tenantIds } } as never) : false;
};

/** Delete: admin only. */
export const adminOnly: Access = ({ req }) => req?.user?.role === 'admin';

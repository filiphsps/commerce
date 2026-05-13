import type { Access } from 'payload';

/**
 * Pull the tenant id out of a multi-tenant plugin entry, regardless of
 * whether the relation has been populated to a full doc or left as an id.
 */
const tenantIdOf = (entry: unknown): string | null => {
    if (!entry || typeof entry !== 'object') return null;
    const t = (entry as { tenant?: unknown }).tenant;
    if (t == null) return null;
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return String(t);
    if (typeof t === 'object' && 'id' in t) return String((t as { id: unknown }).id);
    return null;
};

const extractTenantIds = (user: { tenants?: unknown } | null | undefined): string[] => {
    if (!Array.isArray(user?.tenants)) return [];
    return user.tenants.map(tenantIdOf).filter((id): id is string => Boolean(id));
};

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

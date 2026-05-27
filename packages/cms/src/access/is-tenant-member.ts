import type { Access } from 'payload';
import type { CmsUser } from './is-admin';
import { extractTenantIds } from './tenant-id-of';

/**
 * Access predicate factory that grants read access to any user who belongs to
 * at least one tenant. Admins see all documents; editors see only their own
 * tenants via a `{ tenant: { in: [...] } }` Payload where-clause.
 *
 * @returns A Payload `Access` function scoped to the requesting user's tenants.
 *
 * @example
 *   read: isTenantMember()
 */
export const isTenantMember = (): Access<CmsUser> => {
    return ({ req }) => {
        const user = req?.user;
        if (!user) return false;
        if (user.role === 'admin') return true;
        const tenantIds = extractTenantIds(user as { tenants?: unknown } | null | undefined);
        if (tenantIds.length === 0) return false;
        return { tenant: { in: tenantIds } };
    };
};

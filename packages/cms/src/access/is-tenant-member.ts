import type { Access } from 'payload';
import type { CmsUser } from './is-admin';
import { extractTenantIds } from './tenant-id-of';

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

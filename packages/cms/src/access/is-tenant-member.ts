import type { Access } from 'payload';
import type { CmsUser } from './is-admin';

export const isTenantMember = (): Access<CmsUser> => {
    return ({ req }) => {
        const user = req?.user;
        if (!user) return false;
        if (user.role === 'admin') return true;
        const tenantIds = (user.tenants ?? []).map((t: { tenant: string }) => t.tenant);
        if (tenantIds.length === 0) return false;
        return { tenant: { in: tenantIds } };
    };
};

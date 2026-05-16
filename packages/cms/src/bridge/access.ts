import type { BridgeAccess } from './manifest';

export const adminOnly: BridgeAccess = ({ user }) => user?.role === 'admin';

export const tenantMemberCanRead: BridgeAccess = ({ user, domain }) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Array.isArray(user.tenants) && user.tenants.includes(domain);
};

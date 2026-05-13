import type { Access } from 'payload';
import type { CmsUser } from './is-admin';

const tenantIdOf = (entry: unknown): string | null => {
    if (!entry || typeof entry !== 'object') return null;
    const t = (entry as { tenant?: unknown }).tenant;
    if (t == null) return null;
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return String(t);
    if (typeof t === 'object' && 'id' in t) return String((t as { id: unknown }).id);
    return null;
};

export const isTenantMember = (): Access<CmsUser> => {
    return ({ req }) => {
        const user = req?.user;
        if (!user) return false;
        if (user.role === 'admin') return true;
        const tenantIds = (user.tenants ?? [])
            .map((entry: unknown) => tenantIdOf(entry))
            .filter((id: string | null): id is string => Boolean(id));
        if (tenantIds.length === 0) return false;
        return { tenant: { in: tenantIds } };
    };
};

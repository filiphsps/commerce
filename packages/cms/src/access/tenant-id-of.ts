/**
 * Pull the tenant id out of a multi-tenant plugin entry, regardless of whether
 * the relation has been populated to a full doc or left as a raw id. Used by
 * both `isTenantMember` and `tenantScopedRead`/`tenantScopedWrite`, so the
 * normalization stays in lockstep — when two copies drifted apart the second
 * predicate ended up handling fewer shapes than the first and a few rows
 * silently became unreadable for editors.
 */
export const tenantIdOf = (entry: unknown): string | null => {
    if (!entry || typeof entry !== 'object') return null;
    const t = (entry as { tenant?: unknown }).tenant;
    if (t == null) return null;
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return String(t);
    if (typeof t === 'object' && 'id' in t) return String((t as { id: unknown }).id);
    return null;
};

export const extractTenantIds = (user: { tenants?: unknown } | null | undefined): string[] => {
    if (!user || !Array.isArray(user.tenants)) return [];
    return user.tenants.map(tenantIdOf).filter((id): id is string => Boolean(id));
};

import 'server-only';

import type { Payload } from 'payload';

// A shop's existence is stable within a process once observed. Cache per
// Payload instance to avoid re-hitting Mongo on every CMS query. WeakMap so
// test harnesses that spin up fresh Payload mocks get a fresh cache and never
// see stale entries.
const tenantIdCache = new WeakMap<Payload, Map<string, string>>();

/**
 * Resolves a `Shop._id` (from `@nordcom/commerce-db`) to the tenant key used by
 * `@payloadcms/plugin-multi-tenant` for `where: { tenant: { equals } }` scoping.
 *
 * UNIFY-03 repointed `tenantsSlug` from the dedicated `tenants` collection onto
 * `shops` (shop == tenant, keyed on the shop row id), so the plugin now writes
 * the shop row's own `_id` into every tenant-scoped doc's `tenant` field. The
 * tenant key therefore IS the shop id — this resolver collapses from the old
 * shop-to-tenant-document translation down to identity over the shop id. It
 * confirms the shop row exists (the unified `shops` collection backs both the
 * Mongoose model and the Payload tenant) and returns that same id; the prior
 * indirection through a separate tenant document is gone.
 *
 * @param payload - Active Payload instance; used to confirm the shop row exists
 *   and as the per-instance cache key so each test harness gets its own cache.
 * @param shopId - The `Shop._id` from `@nordcom/commerce-db`.
 * @returns The shop id for an existing shop, or `null` when `shopId` is empty or
 *   no shop row matches. Callers treat `null` as "no scope — return no content"
 *   and must never broaden the predicate, which would leak cross-tenant docs.
 *
 * @example
 * const tenantId = await resolveTenantId(payload, shop.id);
 * if (!tenantId) return [];
 * const { docs } = await payload.find({
 *     collection: 'pages',
 *     where: { tenant: { equals: tenantId } },
 * });
 */
export const resolveTenantId = async (payload: Payload, shopId: string): Promise<string | null> => {
    if (!shopId) return null;

    const cached = tenantIdCache.get(payload)?.get(shopId);
    if (cached) return cached;

    const { docs } = await payload.find({
        collection: 'shops',
        where: { id: { equals: shopId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
    });

    const resolved = typeof docs[0]?.id === 'string' ? docs[0].id : null;
    if (resolved) {
        let cache = tenantIdCache.get(payload);
        if (!cache) {
            cache = new Map();
            tenantIdCache.set(payload, cache);
        }
        cache.set(shopId, resolved);
    }
    return resolved;
};

/**
 * Wipe the per-Payload shop-resolution cache. Test-only — call between test
 * cases that share a Payload instance to prevent cross-test cache hits.
 *
 * @param payload - The Payload instance whose cache entry to remove.
 */
export const __resetTenantIdCache = (payload: Payload): void => {
    tenantIdCache.delete(payload);
};

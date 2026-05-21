import 'server-only';

import type { Payload } from 'payload';

/**
 * Translates `Shop._id` (from `@nordcom/commerce-db`) to the Payload-generated
 * Tenant document `_id` used by `@payloadcms/plugin-multi-tenant`.
 *
 * The multi-tenant plugin auto-injects a `tenant` field on tenant-scoped
 * collections (pages, articles, header, footer, businessData, …) and writes
 * the Tenant document's own `_id` into it — NOT the source Shop._id. The
 * tenants collection carries a `shopId` field that points back to the Shop
 * (see `shop-sync/post-save-hook.ts`), so this helper bridges between them.
 *
 * Without this translation the storefront filters with
 * `where: { tenant: { equals: shop.id } }` and never matches anything.
 *
 * Returns `null` when no tenant exists for the given shop — callers should
 * treat this as "no content" rather than broadening the predicate.
 */

// `Tenant._id` is stable for a given `Shop._id` once the post-save hook has
// run (the upsert keys on `shopId`). Cache per Payload instance to avoid an
// extra Mongo round-trip on every CMS query. WeakMap so test harnesses that
// spin up fresh Payload mocks get a fresh cache and never see stale entries.
const tenantIdCache = new WeakMap<Payload, Map<string, string>>();

export const resolveTenantId = async (payload: Payload, shopId: string): Promise<string | null> => {
    if (!shopId) return null;

    const cached = tenantIdCache.get(payload)?.get(shopId);
    if (cached) return cached;

    const { docs } = await payload.find({
        collection: 'tenants',
        where: { shopId: { equals: shopId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
    });

    const tenantId = typeof docs[0]?.id === 'string' ? docs[0].id : null;
    if (tenantId) {
        let cache = tenantIdCache.get(payload);
        if (!cache) {
            cache = new Map();
            tenantIdCache.set(payload, cache);
        }
        cache.set(shopId, tenantId);
    }
    return tenantId;
};

/** Test-only: wipe the per-Payload cache. */
export const __resetTenantIdCache = (payload: Payload): void => {
    tenantIdCache.delete(payload);
};

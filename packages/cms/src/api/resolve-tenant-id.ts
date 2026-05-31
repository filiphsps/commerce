import 'server-only';

import type { Payload } from 'payload';
import { LEGACY_TENANTS_SLUG } from '../legacy-tenants-slug';

// `Tenant._id` is stable for a given `Shop._id` once the post-save hook has
// run (the upsert keys on `shopId`). Cache per Payload instance to avoid an
// extra Mongo round-trip on every CMS query. WeakMap so test harnesses that
// spin up fresh Payload mocks get a fresh cache and never see stale entries.
const tenantIdCache = new WeakMap<Payload, Map<string, string>>();

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
 * Without this translation, storefront filters using
 * `where: { tenant: { equals: shop.id } }` never match anything.
 *
 * @param payload - Active Payload instance; used as the WeakMap key so each
 *   test harness gets its own isolated cache.
 * @param shopId - The `Shop._id` from `@nordcom/commerce-db`.
 * @returns The matching Tenant document `_id`, or `null` when no tenant exists
 *   for the given shop. Callers should treat `null` as "no content."
 *
 * @example
 * const tenantId = await resolveTenantId(payload, shop.id);
 * if (!tenantId) return [];
 * const { docs } = await payload.find({ collection: 'pages', where: { tenant: { equals: tenantId } } });
 */
export const resolveTenantId = async (payload: Payload, shopId: string): Promise<string | null> => {
    if (!shopId) return null;

    const cached = tenantIdCache.get(payload)?.get(shopId);
    if (cached) return cached;

    const { docs } = await payload.find({
        collection: LEGACY_TENANTS_SLUG,
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

/**
 * Wipe the per-Payload tenant-id cache. Test-only — call between test cases
 * that share a Payload instance to prevent cross-test cache hits.
 *
 * @param payload - The Payload instance whose cache entry to remove.
 */
export const __resetTenantIdCache = (payload: Payload): void => {
    tenantIdCache.delete(payload);
};

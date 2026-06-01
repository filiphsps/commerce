import { defineCache, str } from '@tagtree/core';

// CMS doc shape from Payload — tenant can be either a string ID or a populated
// relation object. The Payload revalidate hook normalizes this before calling.
export type CmsTenant = string | { id: string };

/**
 * The CMS cache taxonomy: the `cms` namespace, its tenant axis, and one entity per
 * Payload-backed CMS collection (the seven content types whose reads are cached).
 *
 * This is the SINGLE source of truth for the tag hierarchy, deliberately free of
 * `server-only` so it can be imported from BOTH sides of the cache contract: the
 * Next.js read adapter ({@link import('./cache').cmsCache}, which wraps this schema in a
 * `server-only` `nextAdapter`) and the Convex revalidation bridge (which derives the
 * exact same tags from a publish event). Keeping the schema here — rather than inside
 * `cache.ts` next to the adapter — is what lets the Convex runtime compute identical
 * tags without dragging `server-only`/`@tagtree/next` into its bundle.
 *
 * @example
 * ```ts
 * const tags = computeFanout(cmsCacheSchema.schema, { entity: 'pages', tenant: shop, params: { key: slug } });
 * ```
 */
export const cmsCacheSchema = defineCache({
    namespace: 'cms',
    tenant: {
        type: '' as unknown as CmsTenant,
        key: (t) => (typeof t === 'string' ? t : t.id),
    },
    entities: {
        pages: { params: { key: str } },
        articles: { params: { key: str } },
        header: { params: { key: str } },
        footer: { params: { key: str } },
        businessData: { params: { key: str } },
        productMetadata: { params: { key: str } },
        collectionMetadata: { params: { key: str } },
    },
});

/**
 * Tenant-root tags for CMS reads that aren't entity-specific (e.g., sitemap
 * indexes that wrap many CMS-driven sub-routes), and the target a broad publish
 * busts. Matches the fanout that `cmsCache.invalidate.tenant(shop)` produces.
 *
 * @param shop - Tenant identifier; only `id` is read so any shop-like object satisfies the contract.
 * @returns The Next.js cache tags covering every CMS entity for this tenant plus the global `'cms'` tag, ordered tenant-root then namespace-root.
 * @example
 * ```ts
 * return fetch(sitemapUrl, {
 *   next: { tags: cmsTenantRootTags(shop) },
 * });
 * ```
 */
export const cmsTenantRootTags = (shop: { id: string }): string[] => {
    return [`cms.${shop.id}`, 'cms'];
};

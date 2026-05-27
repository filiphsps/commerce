import 'server-only';

import { createCacheInstance, defineCache, str } from '@tagtree/core';
import { nextAdapter } from '@tagtree/next';

// CMS doc shape from Payload — tenant can be either a string ID or a populated
// relation object. The Payload hook (Task 27) normalizes this before calling.
type CmsTenant = string | { id: string };

const schema = defineCache({
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
 * Singleton cache instance for all CMS collections, keyed by tenant ID.
 * Use {@link cmsTenantRootTags} when you need tags that span a full tenant
 * rather than a single entity type.
 *
 * @example
 * const tags = cmsCache.tags.pages({ tenant: shop, key: slug });
 * return fetch(url, { next: { tags } });
 */
export const cmsCache = createCacheInstance(schema, nextAdapter());

/**
 * Tenant-root tags for CMS reads that aren't entity-specific (e.g., sitemap
 * indexes that wrap many CMS-driven sub-routes). Matches the fanout that
 * `cmsCache.invalidate.tenant(shop)` produces.
 *
 * @param shop - Tenant identifier; only `id` is read so any shop-like object satisfies the contract.
 * @returns An array of Next.js cache tags that cover every CMS entity for this tenant plus the global `'cms'` tag.
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

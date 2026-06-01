import 'server-only';

import { createCacheInstance } from '@tagtree/core';
import { nextAdapter } from '@tagtree/next';

import { cmsCacheSchema } from './cache-descriptor';

export { cmsTenantRootTags } from './cache-descriptor';

/**
 * Singleton cache instance for all CMS collections, keyed by tenant ID. Binds the
 * shared {@link cmsCacheSchema} taxonomy to the `server-only` Next.js adapter; the
 * schema itself lives in `./cache-descriptor` so the Convex revalidation bridge can
 * derive identical tags without importing `server-only`. Use
 * {@link import('./cache-descriptor').cmsTenantRootTags} when you need tags that span a
 * full tenant rather than a single entity type.
 *
 * @example
 * const key = cmsCache.keys.pages({ tenant: shop, key: slug });
 * return fetch(url, { next: { tags: key.tags } });
 */
export const cmsCache = createCacheInstance(cmsCacheSchema, nextAdapter());

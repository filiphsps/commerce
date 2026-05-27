import 'server-only';

import type { AdapterCtx, CacheAdapter, WriteOpts } from '@tagtree/core';
import { revalidateTag, unstable_cache } from 'next/cache';

/**
 * Creates a {@link CacheAdapter} that binds tagtree's cache lifecycle to the
 * Next.js data cache, so consumers call `wrap` and `invalidate` without managing
 * `unstable_cache` or `revalidateTag` directly.
 *
 * @returns A `CacheAdapter` whose `wrap` delegates to `unstable_cache` and whose
 *   `invalidate` calls `revalidateTag` per tag in `'max'` mode.
 * @example
 * ```ts
 * import { createCacheInstance, defineCache } from '@tagtree/core';
 * import { nextAdapter } from '@tagtree/next';
 *
 * const shopifySchema = defineCache({ namespace: 'shopify', entities: {} });
 * const cache = createCacheInstance(shopifySchema, nextAdapter());
 * ```
 */
export function nextAdapter(): CacheAdapter {
    return {
        async read() {
            // Next's data cache is opaque from outside — wrap is the only entry point.
            return undefined;
        },
        async write() {
            // No-op — wrap handles writes via unstable_cache.
        },
        async invalidate(tags) {
            for (const tag of tags) {
                revalidateTag(tag, 'max');
            }
        },
        async wrap<R>(
            key: string,
            fetcher: () => Promise<R>,
            tags: string[],
            opts: WriteOpts,
            _ctx: AdapterCtx,
        ): Promise<R> {
            const wrapped = unstable_cache(fetcher, [key], { tags, revalidate: opts.ttl });
            return (await wrapped()) as R;
        },
    };
}

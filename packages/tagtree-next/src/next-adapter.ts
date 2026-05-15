import 'server-only';

import type { AdapterCtx, CacheAdapter, WriteOpts } from '@tagtree/core';
import { revalidateTag, unstable_cache } from 'next/cache';

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

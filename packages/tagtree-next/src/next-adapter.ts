import { revalidateTag, unstable_cache } from 'next/cache';
import type { CacheAdapter } from 'tagtree';

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
		async wrap<R>(key: string, fetcher: () => Promise<R>, tags: string[], opts) {
			const wrapped = unstable_cache(
				fetcher,
				[key],
				{ tags, revalidate: opts.ttl },
			);
			return (await wrapped()) as R;
		},
	};
}

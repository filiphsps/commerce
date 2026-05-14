import type { AdapterCtx, CacheAdapter, WriteOpts } from './adapter';

interface Entry {
    value: unknown;
    tags: string[];
    writtenAt: number;
    expiresAt?: number;
}

export interface MemoryAdapterOptions {
    maxEntries?: number;
}

export function memoryAdapter(opts: MemoryAdapterOptions = {}): CacheAdapter {
    const maxEntries = opts.maxEntries ?? 1000;
    const store = new Map<string, Entry>();
    const tagIndex = new Map<string, Set<string>>();
    const tagInvalidatedAt = new Map<string, number>();

    const evictKey = (key: string) => {
        const entry = store.get(key);
        if (!entry) return;
        store.delete(key);
        for (const tag of entry.tags) {
            tagIndex.get(tag)?.delete(key);
        }
    };

    return {
        async read(key, _ctx: AdapterCtx) {
            const entry = store.get(key);
            if (!entry) return undefined;
            if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
                evictKey(key);
                return undefined;
            }
            // Touch for LRU: re-insert at the end.
            store.delete(key);
            store.set(key, entry);
            return { value: entry.value, tags: entry.tags };
        },

        async write(key: string, value: unknown, tags: string[], options: WriteOpts, _ctx: AdapterCtx) {
            if (options.writeIfNewerThan !== undefined) {
                for (const tag of tags) {
                    const invAt = tagInvalidatedAt.get(tag);
                    if (invAt !== undefined && invAt >= options.writeIfNewerThan) {
                        return;
                    }
                }
            }

            evictKey(key);

            const entry: Entry = {
                value,
                tags,
                writtenAt: Date.now(),
                expiresAt: options.ttl !== undefined ? Date.now() + options.ttl * 1000 : undefined,
            };
            store.set(key, entry);
            for (const tag of tags) {
                let bucket = tagIndex.get(tag);
                if (!bucket) {
                    bucket = new Set();
                    tagIndex.set(tag, bucket);
                }
                bucket.add(key);
            }

            while (store.size > maxEntries) {
                const oldest = store.keys().next().value;
                if (oldest === undefined) break;
                evictKey(oldest);
            }
        },

        async invalidate(tags: string[], _ctx: AdapterCtx) {
            const now = Date.now();
            for (const tag of tags) {
                tagInvalidatedAt.set(tag, now);
                const keys = tagIndex.get(tag);
                if (!keys) continue;
                for (const key of [...keys]) {
                    evictKey(key);
                }
                tagIndex.delete(tag);
            }
        },
    };
}

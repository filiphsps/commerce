import type { AdapterCtx, CacheAdapter, ILogger, WriteOpts } from './adapter';
import { consoleLogger } from './adapter';
import { buildInvalidateNamespace, type InvalidateNamespace } from './invalidate';
import { buildKeyFactory, type CacheKey, type KeyFactory } from './keys';
import type { CacheSchema, CacheSchemaShape, EntitiesMap } from './schema';

export interface WrapOpts {
    ttl?: number;
    swr?: boolean;
    stalenessGuard?: boolean;
}

export interface CacheInstance<
    NS extends string = string,
    T = unknown,
    Q = unknown,
    E extends EntitiesMap = EntitiesMap,
> {
    schema: CacheSchemaShape<NS, T, Q, E>;
    keys: KeyFactory<T, Q, E>;
    invalidate: InvalidateNamespace<T, E>;
    wrap<R>(key: CacheKey, fetcher: () => Promise<R>, opts?: WrapOpts): Promise<R>;
    read<R = unknown>(key: CacheKey): Promise<R | undefined>;
    write<R>(key: CacheKey, value: R, opts?: WriteOpts): Promise<void>;
    invalidateRaw(tags: string[]): Promise<void>;
}

export function createCacheInstance<NS extends string, T, Q, E extends EntitiesMap>(
    cache: CacheSchema<NS, T, Q, E>,
    adapter: CacheAdapter,
    options: { logger?: ILogger } = {},
): CacheInstance<NS, T, Q, E> {
    const ctx: AdapterCtx = { schema: cache.schema, logger: options.logger ?? consoleLogger };
    const keys = buildKeyFactory(cache.schema);

    const instance: CacheInstance<NS, T, Q, E> = {
        schema: cache.schema,
        keys,
        invalidate: undefined as unknown as InvalidateNamespace<T, E>,

        async wrap<R>(key: CacheKey, fetcher: () => Promise<R>, opts: WrapOpts = {}): Promise<R> {
            const writeOpts: WriteOpts = { ttl: opts.ttl, swr: opts.swr };
            if (opts.stalenessGuard) writeOpts.writeIfNewerThan = Date.now();

            if (adapter.wrap) {
                return adapter.wrap(key.readTag, fetcher, key.tags, writeOpts, ctx);
            }

            const hit = await adapter.read(key.readTag, ctx);
            if (hit !== undefined) return hit.value as R;

            const startedAt = Date.now();
            const value = await fetcher();
            if (opts.stalenessGuard) writeOpts.writeIfNewerThan = startedAt;
            await adapter.write(key.readTag, value, key.tags, writeOpts, ctx);
            return value;
        },

        async read<R>(key: CacheKey): Promise<R | undefined> {
            const hit = await adapter.read(key.readTag, ctx);
            return hit ? (hit.value as R) : undefined;
        },

        async write<R>(key: CacheKey, value: R, opts: WriteOpts = {}): Promise<void> {
            await adapter.write(key.readTag, value, key.tags, opts, ctx);
        },

        async invalidateRaw(tags: string[]): Promise<void> {
            await adapter.invalidate(tags, ctx);
        },
    };

    instance.invalidate = buildInvalidateNamespace(cache.schema, (tags) => instance.invalidateRaw(tags));
    return instance;
}

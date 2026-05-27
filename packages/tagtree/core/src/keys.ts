import { computeFanout } from './fanout';
import type { CacheSchemaShape, EntitiesMap } from './schema';
import type { ParamMap, ParamValues } from './types';

/**
 * Structured cache-key object produced by a `KeyFactory`; carries a primary tag for logging, the
 * full invalidation fanout, and a qualifier-suffixed read tag for adapter lookups.
 *
 * @example
 * ```ts
 * const key = cache.keys.product({ tenant: shop, id: '123' });
 * const data = await cache.wrap(key, () => fetchProduct('123'));
 * ```
 */
export interface CacheKey {
    /** The leaf tag without qualifier suffix, used in log messages to identify the cache entry. */
    primary: string; // leaf tag, used in logs
    /** Full fanout from deepest (most specific) to shallowest (namespace root), used to populate the tag index on write. */
    tags: string[]; // full fanout, deepest → shallowest, for invalidation indexing
    /** Lookup key for the adapter's `read`/`write` calls; equals `primary` when no qualifier is set, or `primary + "::" + qualifierKey` when a qualifier is present. */
    readTag: string; // primary + qualifier suffix, used as cache lookup key
}

type ParamsOf<D> = D extends { params: infer P } ? (P extends ParamMap ? P : undefined) : undefined;

type KeyBuilderArg<T, Q, D> = { tenant?: T; qualifier?: Q } & ParamValues<ParamsOf<D>>;

/**
 * Per-entity key builder map derived from a `CacheSchemaShape`; each method accepts tenant,
 * qualifier, and entity-specific param values and returns a fully resolved `CacheKey`.
 *
 * @example
 * ```ts
 * const key = cache.keys.product({ tenant: shop, qualifier: locale, id: '123' });
 * ```
 */
export type KeyFactory<T = unknown, Q = unknown, E extends EntitiesMap = EntitiesMap> = {
    [K in keyof E]: (arg: KeyBuilderArg<T, Q, E[K]>) => CacheKey;
};

/**
 * Constructs the `KeyFactory` object for a schema, generating one typed key-builder closure per
 * declared entity that computes the full fanout and optional qualifier suffix.
 *
 * @param schema - The resolved schema shape defining entities, tenant, and qualifier configuration.
 * @returns A `KeyFactory` where each method accepts entity-specific params and returns a fully resolved `CacheKey`.
 */
export function buildKeyFactory<NS extends string, T, Q, E extends EntitiesMap>(
    schema: CacheSchemaShape<NS, T, Q, E>,
): KeyFactory<T, Q, E> {
    const out: Record<string, unknown> = {};

    for (const [entityName, decl] of Object.entries(schema.entities)) {
        out[entityName] = (arg: { tenant?: T; qualifier?: Q } & Record<string, string | number>) => {
            const params: Record<string, string | number> = {};
            if (decl.params) {
                for (const paramName of Object.keys(decl.params)) {
                    const value = arg[paramName];
                    if (value !== undefined && (typeof value === 'string' || typeof value === 'number')) {
                        params[paramName] = value;
                    }
                }
            }

            const tags = computeFanout(schema, {
                entity: entityName,
                tenant: arg.tenant,
                params,
            });

            const primary = tags[0]!;
            const qualifierKey =
                schema.qualifier && arg.qualifier !== undefined ? schema.qualifier.key(arg.qualifier) : undefined;
            const readTag = qualifierKey ? `${primary}::${qualifierKey}` : primary;

            return { primary, tags, readTag };
        };
    }

    return out as KeyFactory<T, Q, E>;
}

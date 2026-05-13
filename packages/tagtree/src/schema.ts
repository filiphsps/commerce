import type { EntityDecl, ParamMap } from './types';

export interface TenantConfig<T> {
    type: T;
    key: (t: T) => string;
    extraTags?: (t: T) => string[];
}

export interface QualifierConfig<Q> {
    type: Q;
    key: (q: Q) => string;
}

export type EntitiesMap = Record<string, EntityDecl<ParamMap | undefined, readonly string[]>>;

export interface CacheSchemaShape<
    NS extends string = string,
    T = unknown,
    Q = unknown,
    E extends EntitiesMap = EntitiesMap,
> {
    namespace: NS;
    tenant?: TenantConfig<T>;
    qualifier?: QualifierConfig<Q>;
    entities: E;
}

export interface CacheSchema<
    NS extends string = string,
    T = unknown,
    Q = unknown,
    E extends EntitiesMap = EntitiesMap,
> {
    schema: CacheSchemaShape<NS, T, Q, E>;
}

export function defineCache<const NS extends string, T, Q, const E extends EntitiesMap>(input: {
    namespace: NS;
    tenant?: TenantConfig<T>;
    qualifier?: QualifierConfig<Q>;
    entities: E;
}): CacheSchema<NS, T, Q, E> {
    if (input.namespace.includes('.')) {
        throw new Error(`tagtree: namespace cannot contain "." (got "${input.namespace}")`);
    }
    for (const name of Object.keys(input.entities)) {
        if (name.includes('.')) {
            throw new Error(`tagtree: entity name cannot contain "." (got "${name}")`);
        }
    }
    return { schema: input as CacheSchemaShape<NS, T, Q, E> };
}

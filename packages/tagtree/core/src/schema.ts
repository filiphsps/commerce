import type { EntityDecl, ParamMap } from './types';

/**
 * Declares how a tenant value maps to a cache-key prefix; the `key` function serializes the
 * tenant to its string segment, while `extraTags` injects additional per-tenant invalidation
 * tags such as a shop's custom domain alias.
 *
 * @example
 * ```ts
 * const tenant: TenantConfig<Shop> = {
 *     type: {} as Shop,
 *     key: (shop) => shop.id,
 *     extraTags: (shop) => shop.domains,
 * };
 * ```
 */
export interface TenantConfig<T> {
    /** Phantom field carrying the TypeScript type of the tenant value for inference. */
    type: T;
    /** Derives the string segment that prefixes all cache tags for this tenant. */
    key(t: T): string;
    /** Optional function that returns additional tag suffixes to include alongside the tenant root tag during fanout. */
    extraTags?(t: T): string[];
}

/**
 * Declares how a qualifier value (e.g., a locale or currency code) appends a `::key` suffix to
 * read tags, isolating cache entries for the same entity but different request contexts without
 * duplicating the invalidation tag hierarchy.
 *
 * @example
 * ```ts
 * const qualifier: QualifierConfig<string> = {
 *     type: '' as string,
 *     key: (locale) => locale,
 * };
 * ```
 */
export interface QualifierConfig<Q> {
    /** Phantom field carrying the TypeScript type of the qualifier value for inference. */
    type: Q;
    /** Derives the qualifier string that is appended to the primary tag with `::` as separator. */
    key(q: Q): string;
}

/**
 * Constraint type for the `entities` record passed to `defineCache`; maps entity names to their
 * `EntityDecl` shapes, ensuring all values conform to the expected param and parent structure
 * before the schema is frozen.
 *
 * @example
 * ```ts
 * const entities = {
 *     product: { params: { id: str } },
 *     collection: { params: { handle: str }, parents: ['product'] },
 * } satisfies EntitiesMap;
 * ```
 */
export type EntitiesMap = Record<string, EntityDecl<ParamMap | undefined, readonly string[]>>;

/**
 * Fully-resolved schema descriptor held at runtime; carries namespace, optional tenant and
 * qualifier configs, and the entity declarations that drive key building and fanout expansion.
 *
 * @example
 * ```ts
 * const schema: CacheSchemaShape = defineCache({ namespace: 'commerce', entities: {} }).schema;
 * ```
 */
export interface CacheSchemaShape<
    NS extends string = string,
    T = unknown,
    Q = unknown,
    E extends EntitiesMap = EntitiesMap,
> {
    /** Top-level dotted-path prefix applied to all tags produced by this schema; must not contain `.`. */
    namespace: NS;
    /** Optional tenant axis config; when present, all cache tags are scoped per tenant value. */
    tenant?: TenantConfig<T>;
    /** Optional qualifier axis config; when present, read tags gain a per-qualifier `::key` suffix. */
    qualifier?: QualifierConfig<Q>;
    /** Map of entity names to their parameter and parent declarations. */
    entities: E;
}

/**
 * Opaque wrapper returned by `defineCache`; wraps the resolved `CacheSchemaShape` to prevent
 * callers from constructing or mutating the shape directly after validation.
 *
 * @example
 * ```ts
 * const productSchema: CacheSchema = defineCache({ namespace: 'commerce', entities: {} });
 * const cache = createCacheInstance(productSchema, memoryAdapter());
 * ```
 */
export interface CacheSchema<
    NS extends string = string,
    T = unknown,
    Q = unknown,
    E extends EntitiesMap = EntitiesMap,
> {
    schema: CacheSchemaShape<NS, T, Q, E>;
}

/**
 * Validates and freezes a cache schema definition, rejecting namespace or entity names that
 * contain `.` (which would produce ambiguous dotted tags), then returns a `CacheSchema` ready
 * to pass to `createCacheInstance`.
 *
 * @param input - Raw schema definition with namespace, optional tenant and qualifier configs, and entity declarations.
 * @returns A validated `CacheSchema` wrapping the resolved shape.
 * @throws {Error} When `input.namespace` contains `.`.
 * @throws {Error} When any entity name in `input.entities` contains `.`.
 * @example
 * ```ts
 * const productSchema = defineCache({
 *     namespace: 'commerce',
 *     tenant: { type: {} as Shop, key: (s) => s.id },
 *     entities: { product: { params: { id: str } } },
 * });
 * ```
 */
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

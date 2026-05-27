import { joinSegments } from './encode';
import type { CacheSchemaShape, EntitiesMap } from './schema';

/**
 * Arguments to `computeFanout` describing which entity to expand and the optional tenant and
 * param values that narrow the resulting tag set.
 *
 * @example
 * ```ts
 * const tags = computeFanout(mySchema.schema, {
 *     entity: 'product',
 *     tenant: shop,
 *     params: { id: '123' },
 * });
 * ```
 */
export interface FanoutInput<T = unknown> {
    /** Name of the entity declared in the schema to expand into invalidation tags. */
    entity: string;
    /** Tenant value whose key is prepended to all tags when the schema defines a `TenantConfig`. */
    tenant?: T;
    /** Per-entity parameter values that produce a leaf tag when all declared params are present. */
    params?: Record<string, string | number>;
}

/**
 * Expands a single entity reference into its full set of invalidation tags, from the most-specific
 * leaf tag down to the namespace root, following the hierarchy declared in the schema.
 *
 * @param schema - Resolved cache schema shape containing entity, tenant, and namespace configuration.
 * @param input - Entity reference with optional tenant and params that narrow the expansion.
 * @returns Ordered array of cache tags from leaf to namespace root, suitable for passing to an adapter's `invalidate` call.
 * @throws {Error} When `input.entity` is not declared in `schema.entities`.
 * @example
 * ```ts
 * const tags = computeFanout(productSchema.schema, {
 *     entity: 'product',
 *     tenant: shop,
 *     params: { id: '123' },
 * });
 * // ['commerce.acme.product.123', 'commerce.acme.product', 'commerce.acme', 'commerce']
 * ```
 */
export function computeFanout<NS extends string, T, Q, E extends EntitiesMap>(
    schema: CacheSchemaShape<NS, T, Q, E>,
    input: FanoutInput<T>,
): string[] {
    const decl = schema.entities[input.entity];
    if (!decl) {
        throw new Error(`tagtree: unknown entity "${input.entity}" in namespace "${schema.namespace}"`);
    }

    const tenantKey = schema.tenant && input.tenant !== undefined ? schema.tenant.key(input.tenant) : undefined;
    const tenantPrefix: Array<string | number> = tenantKey ? [schema.namespace, tenantKey] : [schema.namespace];

    const tags: string[] = [];

    // 1. Leaf tag — only when all declared params are supplied.
    const declaredParams = decl.params ? Object.keys(decl.params) : [];
    const hasAllParams = declaredParams.length > 0 && declaredParams.every((k) => input.params?.[k] !== undefined);
    if (hasAllParams && input.params) {
        const leaf = [...tenantPrefix, input.entity, ...declaredParams.map((k) => input.params![k]!)];
        tags.push(joinSegments(leaf));
    }

    // 2. Entity-collection tag (entity name, no params).
    tags.push(joinSegments([...tenantPrefix, input.entity]));

    // 3. Explicit parent entity-collection tags.
    if (decl.parents) {
        for (const parent of decl.parents) {
            tags.push(joinSegments([...tenantPrefix, parent]));
        }
    }

    // 4. Tenant extraTags (e.g., shop domain).
    if (schema.tenant && input.tenant !== undefined && schema.tenant.extraTags) {
        for (const extra of schema.tenant.extraTags(input.tenant)) {
            tags.push(joinSegments([schema.namespace, tenantKey!, extra]));
        }
    }

    // 5. Tenant root.
    if (tenantKey) {
        tags.push(joinSegments([schema.namespace, tenantKey]));
    }

    // 6. Namespace root.
    tags.push(joinSegments([schema.namespace]));

    return tags;
}

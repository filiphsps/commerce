import { joinSegments } from './encode';
import { computeFanout } from './fanout';
import type { CacheSchemaShape, EntitiesMap } from './schema';
import type { ParamMap, ParamValues } from './types';

type ParamsOf<D> = D extends { params: infer P } ? (P extends ParamMap ? P : undefined) : undefined;

type EntityInvalidatorArg<T, D> = { tenant?: T } & ParamValues<ParamsOf<D>>;

type EntityInvalidators<E extends EntitiesMap, T> = {
    [K in keyof E]: (arg: EntityInvalidatorArg<T, E[K]>) => Promise<void>;
};

/**
 * Typed invalidation surface generated from a `CacheSchemaShape`; exposes a method per declared
 * entity plus `tenant` and `all` shortcuts, so callers get autocompletion and type-checked params
 * instead of constructing raw tag arrays by hand.
 *
 * @example
 * ```ts
 * // Invalidate a single product by ID for a specific tenant.
 * await cache.invalidate.product({ tenant: shop, id: '123' });
 * // Invalidate all entries for a tenant.
 * await cache.invalidate.tenant(shop);
 * // Purge the entire namespace.
 * await cache.invalidate.all();
 * ```
 */
export type InvalidateNamespace<T = unknown, E extends EntitiesMap = EntitiesMap> = EntityInvalidators<E, T> & {
    tenant(tenant: T): Promise<void>;
    all(): Promise<void>;
};

/**
 * Constructs the `InvalidateNamespace` object for a schema, wiring each entity name to a
 * fanout-then-fire handler and providing `tenant` and `all` shortcut methods.
 *
 * @param schema - The resolved schema shape that defines entities, tenant configuration, and namespace.
 * @param fire - Callback that receives the computed tag array and performs the actual adapter invalidation.
 * @returns A fully-typed `InvalidateNamespace` bound to the schema's entity names and tenant type.
 */
export function buildInvalidateNamespace<NS extends string, T, Q, E extends EntitiesMap>(
    schema: CacheSchemaShape<NS, T, Q, E>,
    fire: (tags: string[]) => Promise<void>,
): InvalidateNamespace<T, E> {
    const ns: Record<string, unknown> = {};

    for (const [entityName, decl] of Object.entries(schema.entities)) {
        ns[entityName] = async (arg: { tenant?: T } & Record<string, string | number>) => {
            const params: Record<string, string | number> = {};
            if (decl.params) {
                for (const k of Object.keys(decl.params)) {
                    const v = arg[k];
                    if (v !== undefined && (typeof v === 'string' || typeof v === 'number')) {
                        params[k] = v;
                    }
                }
            }
            const tags = computeFanout(schema, { entity: entityName, tenant: arg.tenant, params });
            await fire(tags);
        };
    }

    ns.tenant = async (tenant: T) => {
        const tags: string[] = [];
        if (schema.tenant && tenant !== undefined) {
            const key = schema.tenant.key(tenant);
            if (schema.tenant.extraTags) {
                for (const extra of schema.tenant.extraTags(tenant)) {
                    tags.push(joinSegments([schema.namespace, key, extra]));
                }
            }
            tags.push(joinSegments([schema.namespace, key]));
        }
        tags.push(joinSegments([schema.namespace]));
        await fire(tags);
    };

    ns.all = async () => {
        await fire([joinSegments([schema.namespace])]);
    };

    return ns as InvalidateNamespace<T, E>;
}

import { joinSegments } from './encode';
import { computeFanout } from './fanout';
import type { CacheSchemaShape, EntitiesMap } from './schema';
import type { ParamMap, ParamValues } from './types';

type ParamsOf<D> = D extends { params: infer P } ? (P extends ParamMap ? P : undefined) : undefined;

type EntityInvalidatorArg<T, D> = { tenant?: T } & ParamValues<ParamsOf<D>>;

type EntityInvalidators<E extends EntitiesMap, T> = {
    [K in keyof E]: (arg: EntityInvalidatorArg<T, E[K]>) => Promise<void>;
};

export type InvalidateNamespace<T = unknown, E extends EntitiesMap = EntitiesMap> = EntityInvalidators<E, T> & {
    tenant(tenant: T): Promise<void>;
    all(): Promise<void>;
};

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

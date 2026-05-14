import { computeFanout } from './fanout';
import { joinSegments } from './encode';
import type { CacheSchemaShape, EntitiesMap } from './schema';

type EntityInvalidator<T> = (arg: { tenant?: T } & Record<string, string | number>) => Promise<void>;

export interface InvalidateNamespace<T = unknown> {
	[entity: string]:
		| EntityInvalidator<T>
		| ((tenant: T) => Promise<void>)
		| (() => Promise<void>);
	tenant: (tenant: T) => Promise<void>;
	all: () => Promise<void>;
}

export function buildInvalidateNamespace<NS extends string, T, Q, E extends EntitiesMap>(
	schema: CacheSchemaShape<NS, T, Q, E>,
	fire: (tags: string[]) => Promise<void>,
): InvalidateNamespace<T> {
	const ns = {} as InvalidateNamespace<T>;

	for (const [entityName, decl] of Object.entries(schema.entities)) {
		ns[entityName] = async (arg: { tenant?: T } & Record<string, string | number>) => {
			const params: Record<string, string | number> = {};
			if (decl.params) {
				for (const k of Object.keys(decl.params)) {
					const v = arg[k];
					if (v !== undefined) params[k] = v;
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

	return ns;
}

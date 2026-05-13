import { computeFanout } from './fanout';
import type { CacheSchemaShape, EntitiesMap } from './schema';

export interface CacheKey {
	primary: string;       // leaf tag, used in logs
	tags: string[];        // full fanout, deepest → shallowest, for invalidation indexing
	readTag: string;       // primary + qualifier suffix, used as cache lookup key
}

type KeyBuilderArg<T, Q> = { tenant?: T; qualifier?: Q } & Record<string, string | number>;

export type KeyFactory<T = unknown, Q = unknown> = Record<string, (arg: KeyBuilderArg<T, Q>) => CacheKey>;

export function buildKeyFactory<NS extends string, T, Q, E extends EntitiesMap>(
	schema: CacheSchemaShape<NS, T, Q, E>,
): KeyFactory<T, Q> {
	const out: KeyFactory<T, Q> = {};

	for (const [entityName, decl] of Object.entries(schema.entities)) {
		out[entityName] = (arg) => {
			const params: Record<string, string | number> = {};
			if (decl.params) {
				for (const paramName of Object.keys(decl.params)) {
					const value = arg[paramName];
					if (value !== undefined) params[paramName] = value;
				}
			}

			const tags = computeFanout(schema, {
				entity: entityName,
				tenant: arg.tenant,
				params,
			});

			const primary = tags[0]!;
			const qualifierKey = schema.qualifier && arg.qualifier !== undefined
				? schema.qualifier.key(arg.qualifier)
				: undefined;
			const readTag = qualifierKey ? `${primary}::${qualifierKey}` : primary;

			return { primary, tags, readTag };
		};
	}

	return out;
}

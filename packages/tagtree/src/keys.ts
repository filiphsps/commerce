import { computeFanout } from './fanout';
import type { ParamMap, ParamValues } from './types';
import type { CacheSchemaShape, EntitiesMap } from './schema';

export interface CacheKey {
	primary: string;       // leaf tag, used in logs
	tags: string[];        // full fanout, deepest → shallowest, for invalidation indexing
	readTag: string;       // primary + qualifier suffix, used as cache lookup key
}

type ParamsOf<D> = D extends { params: infer P } ? (P extends ParamMap ? P : undefined) : undefined;

type KeyBuilderArg<T, Q, D> = { tenant?: T; qualifier?: Q } & ParamValues<ParamsOf<D>>;

export type KeyFactory<T = unknown, Q = unknown, E extends EntitiesMap = EntitiesMap> = {
	[K in keyof E]: (arg: KeyBuilderArg<T, Q, E[K]>) => CacheKey;
};

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
			const qualifierKey = schema.qualifier && arg.qualifier !== undefined
				? schema.qualifier.key(arg.qualifier)
				: undefined;
			const readTag = qualifierKey ? `${primary}::${qualifierKey}` : primary;

			return { primary, tags, readTag };
		};
	}

	return out as KeyFactory<T, Q, E>;
}

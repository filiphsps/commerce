import { joinSegments } from './encode';
import type { CacheSchemaShape, EntitiesMap } from './schema';

export interface FanoutInput<T = unknown> {
	entity: string;
	tenant?: T;
	params?: Record<string, string | number>;
}

export function computeFanout<NS extends string, T, Q, E extends EntitiesMap>(
	schema: CacheSchemaShape<NS, T, Q, E>,
	input: FanoutInput<T>,
): string[] {
	const decl = schema.entities[input.entity];
	if (!decl) {
		throw new Error(`tagtree: unknown entity "${input.entity}" in namespace "${schema.namespace}"`);
	}

	const tenantKey = schema.tenant && input.tenant !== undefined
		? schema.tenant.key(input.tenant)
		: undefined;
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

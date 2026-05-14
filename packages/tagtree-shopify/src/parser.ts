import { computeFanout } from '@tagtree/core';
import type { CacheSchema, EntitiesMap } from '@tagtree/core';

interface TopicMapping {
	entity: string;
	paramKey?: string; // body field name to read
	paramName?: string; // schema param name to populate
}

const TOPIC_MAP: Record<string, TopicMapping> = {
	'products/update': { entity: 'product', paramKey: 'handle', paramName: 'handle' },
	'products/delete': { entity: 'product', paramKey: 'handle', paramName: 'handle' },
	'products/create': { entity: 'product', paramKey: 'handle', paramName: 'handle' },
	'collections/update': { entity: 'collection', paramKey: 'handle', paramName: 'handle' },
	'collections/delete': { entity: 'collection', paramKey: 'handle', paramName: 'handle' },
	'collections/create': { entity: 'collection', paramKey: 'handle', paramName: 'handle' },
	'pages/update': { entity: 'page', paramKey: 'handle', paramName: 'handle' },
	'pages/delete': { entity: 'page', paramKey: 'handle', paramName: 'handle' },
	'pages/create': { entity: 'page', paramKey: 'handle', paramName: 'handle' },
};

export interface ShopifyParseInput<NS extends string, T, Q, E extends EntitiesMap> {
	schema: CacheSchema<NS, T, Q, E>;
	tenant: T;
	topic: string;
	body: Record<string, unknown>;
}

export function parseShopifyWebhook<NS extends string, T, Q, E extends EntitiesMap>(
	input: ShopifyParseInput<NS, T, Q, E>,
): string[] {
	const mapping = TOPIC_MAP[input.topic];
	if (!mapping) return [];

	// Skip if the user's schema doesn't declare this entity — the plugin
	// never invents tags that don't exist on the read side.
	if (!input.schema.schema.entities[mapping.entity]) return [];

	const handle = mapping.paramKey ? input.body[mapping.paramKey] : undefined;
	const params: Record<string, string | number> = {};
	if (
		handle !== undefined &&
		(typeof handle === 'string' || typeof handle === 'number') &&
		mapping.paramName
	) {
		params[mapping.paramName] = handle;
	}

	return computeFanout(input.schema.schema, {
		entity: mapping.entity,
		tenant: input.tenant,
		params,
	});
}

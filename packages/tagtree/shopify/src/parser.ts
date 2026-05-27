import type { CacheSchema, EntitiesMap } from '@tagtree/core';
import { computeFanout } from '@tagtree/core';

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

/**
 * Input bundle for {@link parseShopifyWebhook} that couples a tagtree `CacheSchema` to a single Shopify webhook event.
 * Annotate the assembled payload with this type before calling `parseShopifyWebhook` to ensure the schema's namespace,
 * tenant type, and entities map are carried through the generic chain.
 *
 * @example
 * ```ts
 * const input: ShopifyParseInput<typeof ns, string, string, typeof entities> = {
 *     schema,
 *     tenant: shop.domain,
 *     topic: webhookTopic,
 *     body: JSON.parse(rawBody) as Record<string, unknown>,
 * };
 * const tags = parseShopifyWebhook(input);
 * ```
 */
export interface ShopifyParseInput<NS extends string, T, Q, E extends EntitiesMap> {
    schema: CacheSchema<NS, T, Q, E>;
    tenant: T;
    topic: string;
    body: Record<string, unknown>;
}

/**
 * Translates a Shopify webhook event into the set of tagtree cache tags that must be invalidated.
 *
 * @param input - Assembled webhook payload pairing the app's tagtree schema with the incoming event; typically built immediately after HMAC verification (`verifyShopifyHmac`).
 * @returns Array of cache tag strings to invalidate; empty when the topic is not mapped or the entity is absent from the schema.
 * @example
 * ```ts
 * const tags = parseShopifyWebhook({
 *     schema,
 *     tenant: shop.domain,
 *     topic: 'products/update',
 *     body: JSON.parse(rawBody) as Record<string, unknown>,
 * });
 * for (const tag of tags) revalidateTag(tag);
 * ```
 */
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
    if (handle !== undefined && (typeof handle === 'string' || typeof handle === 'number') && mapping.paramName) {
        params[mapping.paramName] = handle;
    }

    return computeFanout(input.schema.schema, {
        entity: mapping.entity,
        tenant: input.tenant,
        params,
    });
}

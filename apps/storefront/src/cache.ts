import { defineCache, createCacheInstance, str } from 'tagtree';
import { nextAdapter } from '@tagtree/next';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';

// The storefront's Shopify-facing cache. CMS reads/writes use the schema declared
// in @nordcom/commerce-cms — they're separate namespaces with separate tag trees.
const shopifyCacheSchema = defineCache({
	namespace: 'shopify',
	tenant: {
		type: {} as OnlineShop,
		key: (s) => s.id,
		extraTags: (s) => [s.domain],
	},
	qualifier: {
		type: {} as Locale,
		key: (l) => l.code,
	},
	entities: {
		product: { params: { handle: str }, parents: ['products'] },
		products: {},
		collection: { params: { handle: str }, parents: ['collections'] },
		collections: {},
		page: { params: { handle: str } },
	},
});

export const cache = createCacheInstance(shopifyCacheSchema, nextAdapter());

/**
 * Tenant-root tags for queries that aren't entity-specific. Used by the legacy
 * call sites in api/client.ts and api/shopify.ts that fetch shop-wide data
 * (homepage, navigation, settings) without a particular entity in mind.
 */
export const tenantRootTags = (shop: OnlineShop): string[] => {
	return [`shopify.${shop.id}`, `shopify.${shop.id}.${shop.domain}`, 'shopify'];
};

import { describe, expect, it } from 'vitest';
import { parseShopifyWebhook } from '../src/parser';
import { defineCache, str } from 'tagtree';

type Shop = { id: string; domain: string };

const cache = defineCache({
	namespace: 'shopify',
	tenant: { type: {} as Shop, key: (s) => s.id, extraTags: (s) => [s.domain] },
	entities: {
		product: { params: { handle: str }, parents: ['products'] },
		products: {},
		collection: { params: { handle: str }, parents: ['collections'] },
		collections: {},
		page: { params: { handle: str } },
	},
});

const shop: Shop = { id: 'shop_1', domain: 'example.com' };

describe('parseShopifyWebhook', () => {
	it('products/update with a handle returns leaf + collection + parents + tenant tags', () => {
		const tags = parseShopifyWebhook({
			schema: cache,
			tenant: shop,
			topic: 'products/update',
			body: { handle: 'cool-shirt' },
		});
		expect(tags).toContain('shopify.shop_1.product.cool-shirt');
		expect(tags).toContain('shopify.shop_1.products');
		expect(tags).toContain('shopify.shop_1');
	});

	it('products/delete returns the same tags as products/update', () => {
		const a = parseShopifyWebhook({
			schema: cache,
			tenant: shop,
			topic: 'products/delete',
			body: { handle: 'x' },
		});
		const b = parseShopifyWebhook({
			schema: cache,
			tenant: shop,
			topic: 'products/update',
			body: { handle: 'x' },
		});
		expect(a).toEqual(b);
	});

	it('collections/update emits the collection fanout', () => {
		const tags = parseShopifyWebhook({
			schema: cache,
			tenant: shop,
			topic: 'collections/update',
			body: { handle: 'summer-sale' },
		});
		expect(tags).toContain('shopify.shop_1.collection.summer-sale');
		expect(tags).toContain('shopify.shop_1.collections');
	});

	it('pages/update emits the page fanout', () => {
		const tags = parseShopifyWebhook({
			schema: cache,
			tenant: shop,
			topic: 'pages/update',
			body: { handle: 'about' },
		});
		expect(tags).toContain('shopify.shop_1.page.about');
	});

	it('returns [] for an unknown topic (caller decides whether to broad-sweep)', () => {
		const tags = parseShopifyWebhook({
			schema: cache,
			tenant: shop,
			topic: 'orders/create',
			body: {},
		});
		expect(tags).toEqual([]);
	});

	it("returns [] for a topic whose entity is not declared in the schema", () => {
		const cacheWithoutPages = defineCache({
			namespace: 'shopify',
			tenant: { type: {} as Shop, key: (s) => s.id },
			entities: { product: { params: { handle: str } } },
		});
		const tags = parseShopifyWebhook({
			schema: cacheWithoutPages,
			tenant: shop,
			topic: 'pages/update',
			body: { handle: 'about' },
		});
		expect(tags).toEqual([]);
	});

	it('returns the entity-collection fanout when the body has no handle', () => {
		const tags = parseShopifyWebhook({
			schema: cache,
			tenant: shop,
			topic: 'products/update',
			body: {},
		});
		expect(tags).toContain('shopify.shop_1.products');
		expect(tags).not.toContain('shopify.shop_1.product.cool-shirt');
	});
});

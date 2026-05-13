import { describe, expect, it } from 'vitest';
import { computeFanout } from '../src/fanout';
import { defineCache } from '../src/schema';
import { str } from '../src/types';

type Shop = { id: string; domain: string };

describe('computeFanout', () => {
	const cache = defineCache({
		namespace: 'shopify',
		tenant: {
			type: {} as Shop,
			key: (s) => s.id,
			extraTags: (s) => [s.domain],
		},
		entities: {
			product: { params: { handle: str }, parents: ['products'] },
			products: {},
			collection: { params: { handle: str } },
			page: { params: { slug: str } },
		},
	});
	const shop: Shop = { id: 'shop_1', domain: 'example.com' };

	it('emits leaf → entity-collection → parents → tenant-extras → tenant-root → namespace', () => {
		const tags = computeFanout(cache.schema, {
			entity: 'product',
			tenant: shop,
			params: { handle: 'cool-shirt' },
		});

		expect(tags).toEqual([
			'shopify.shop_1.product.cool-shirt', // leaf
			'shopify.shop_1.product', // entity-collection (no params)
			'shopify.shop_1.products', // explicit parent
			'shopify.shop_1.example%2Ecom', // tenant extraTags (encoded)
			'shopify.shop_1', // tenant root
			'shopify', // namespace root
		]);
	});

	it('omits the leaf when params are not provided (coarse invalidation)', () => {
		const tags = computeFanout(cache.schema, {
			entity: 'products',
			tenant: shop,
		});
		expect(tags).toEqual([
			'shopify.shop_1.products', // collection tag itself
			'shopify.shop_1.example%2Ecom',
			'shopify.shop_1',
			'shopify',
		]);
	});

	it('omits the parent fanout when the entity has no parents', () => {
		const tags = computeFanout(cache.schema, {
			entity: 'page',
			tenant: shop,
			params: { slug: 'about' },
		});
		expect(tags).toEqual([
			'shopify.shop_1.page.about',
			'shopify.shop_1.page',
			'shopify.shop_1.example%2Ecom',
			'shopify.shop_1',
			'shopify',
		]);
	});

	it('works with no tenant config', () => {
		const t = defineCache({
			namespace: 'cms',
			entities: { page: { params: { slug: str } } },
		});
		const tags = computeFanout(t.schema, {
			entity: 'page',
			tenant: undefined,
			params: { slug: 'home' },
		});
		expect(tags).toEqual([
			'cms.page.home',
			'cms.page',
			'cms',
		]);
	});

	it('encodes dots in params', () => {
		const tags = computeFanout(cache.schema, {
			entity: 'product',
			tenant: shop,
			params: { handle: 'weird.handle' },
		});
		expect(tags[0]).toBe('shopify.shop_1.product.weird%2Ehandle');
	});

	it('throws on an unknown entity', () => {
		expect(() =>
			computeFanout(cache.schema, {
				entity: 'sproket' as never,
				tenant: shop,
			}),
		).toThrow(/unknown entity/);
	});
});

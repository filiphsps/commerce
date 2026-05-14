import { describe, expect, it, vi } from 'vitest';
import { payloadHooks } from '../src/hooks';
import { createCacheInstance, defineCache, memoryAdapter, str } from 'tagtree';

const buildCache = () => {
	const schema = defineCache({
		namespace: 'cms',
		tenant: {
			type: '' as unknown as string | { id: string },
			key: (t) => (typeof t === 'string' ? t : t.id),
		},
		entities: {
			pages: { params: { key: str } },
			articles: { params: { key: str } },
			header: { params: { key: str } },
			productMetadata: { params: { key: str } },
		},
	});
	return createCacheInstance(schema, memoryAdapter({ maxEntries: 100 }));
};

describe('payloadHooks', () => {
	it('afterChange invalidates the leaf + entity + tenant tags', async () => {
		const cache = buildCache();
		const spy = vi.spyOn(cache, 'invalidateRaw');
		const hooks = payloadHooks(cache, { entity: 'pages' });

		await hooks.afterChange?.[0]?.({
			doc: { slug: 'home', tenant: 't1', id: 'd1' } as never,
			previousDoc: undefined as never,
			collection: { slug: 'pages' } as never,
			operation: 'update',
			req: {} as never,
			context: {} as never,
		});

		const tags = spy.mock.calls[0]?.[0] as string[];
		expect(tags).toContain('cms.t1.pages.home');
		expect(tags).toContain('cms.t1.pages');
		expect(tags).toContain('cms.t1');
	});

	it('afterDelete also invalidates', async () => {
		const cache = buildCache();
		const spy = vi.spyOn(cache, 'invalidateRaw');
		const hooks = payloadHooks(cache, { entity: 'articles' });

		await hooks.afterDelete?.[0]?.({
			doc: { slug: 'a1', tenant: 't1', id: 'd1' } as never,
			collection: { slug: 'articles' } as never,
			req: {} as never,
			id: 'd1' as never,
		});

		const tags = spy.mock.calls[0]?.[0] as string[];
		expect(tags).toContain('cms.t1.articles.a1');
	});

	it('falls back to doc.id when slug is absent (globals like header)', async () => {
		const cache = buildCache();
		const spy = vi.spyOn(cache, 'invalidateRaw');
		const hooks = payloadHooks(cache, { entity: 'header' });

		await hooks.afterChange?.[0]?.({
			doc: { tenant: 't1', id: 'h1' } as never,
			previousDoc: undefined as never,
			collection: { slug: 'header' } as never,
			operation: 'update',
			req: {} as never,
			context: {} as never,
		});

		const tags = spy.mock.calls[0]?.[0] as string[];
		expect(tags).toContain('cms.t1.header.h1');
	});

	it('uses shopifyHandle when slug is absent (productMetadata)', async () => {
		const cache = buildCache();
		const spy = vi.spyOn(cache, 'invalidateRaw');
		const hooks = payloadHooks(cache, { entity: 'productMetadata' });

		await hooks.afterChange?.[0]?.({
			doc: { shopifyHandle: 'sweet-treats', tenant: 't1', id: 'pm1' } as never,
			previousDoc: undefined as never,
			collection: { slug: 'productMetadata' } as never,
			operation: 'create',
			req: {} as never,
			context: {} as never,
		});

		const tags = spy.mock.calls[0]?.[0] as string[];
		expect(tags).toContain('cms.t1.productMetadata.sweet-treats');
	});

	it('extracts tenant id from a populated tenant relation object', async () => {
		const cache = buildCache();
		const spy = vi.spyOn(cache, 'invalidateRaw');
		const hooks = payloadHooks(cache, { entity: 'pages' });

		await hooks.afterChange?.[0]?.({
			doc: { slug: 'home', tenant: { id: 'shop-1' }, id: 'd1' } as never,
			previousDoc: undefined as never,
			collection: { slug: 'pages' } as never,
			operation: 'update',
			req: {} as never,
			context: {} as never,
		});

		const tags = spy.mock.calls[0]?.[0] as string[];
		expect(tags).toContain('cms.shop-1.pages.home');
	});

	it('no-ops when the doc has no tenant', async () => {
		const cache = buildCache();
		const spy = vi.spyOn(cache, 'invalidateRaw');
		const hooks = payloadHooks(cache, { entity: 'pages' });

		await hooks.afterChange?.[0]?.({
			doc: { slug: 'orphan', id: 'd1' } as never,
			previousDoc: undefined as never,
			collection: { slug: 'pages' } as never,
			operation: 'update',
			req: {} as never,
			context: {} as never,
		});

		expect(spy).not.toHaveBeenCalled();
	});

	it('afterChange returns the unmodified doc (does not silently mutate)', async () => {
		const cache = buildCache();
		const hooks = payloadHooks(cache, { entity: 'pages' });
		const doc = { slug: 'home', tenant: 't1', id: 'd1' };
		const returned = await hooks.afterChange?.[0]?.({
			doc: doc as never,
			previousDoc: undefined as never,
			collection: { slug: 'pages' } as never,
			operation: 'update',
			req: {} as never,
			context: {} as never,
		});
		expect(returned).toBe(doc);
	});
});

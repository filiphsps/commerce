import { describe, expect, it, vi } from 'vitest';
import { buildRevalidateHooks } from './revalidate';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

const { revalidateTag } = await import('next/cache');

describe('buildRevalidateHooks', () => {
    it('afterChange revalidates collection+slug+tenant tags', async () => {
        const hooks = buildRevalidateHooks({ collection: 'pages' });
        await hooks.afterChange?.[0]?.({
            doc: { slug: 'home', tenant: 't1', id: 'd1' } as never,
            previousDoc: undefined as never,
            collection: { slug: 'pages' } as never,
            operation: 'update',
            req: {} as never,
            context: {} as never,
        });
        expect(revalidateTag).toHaveBeenCalledWith('cms.t1.pages.home', 'max');
        expect(revalidateTag).toHaveBeenCalledWith('cms.t1.pages', 'max');
        expect(revalidateTag).toHaveBeenCalledWith('cms.t1', 'max');
    });

    it('afterDelete also revalidates', async () => {
        vi.mocked(revalidateTag).mockClear();
        const hooks = buildRevalidateHooks({ collection: 'articles' });
        await hooks.afterDelete?.[0]?.({
            doc: { slug: 'a1', tenant: 't1', id: 'd1' } as never,
            collection: { slug: 'articles' } as never,
            req: {} as never,
            id: 'd1' as never,
        });
        expect(revalidateTag).toHaveBeenCalledWith('cms.t1.articles.a1', 'max');
    });

    it('falls back to id when slug is absent (e.g. globals)', async () => {
        vi.mocked(revalidateTag).mockClear();
        const hooks = buildRevalidateHooks({ collection: 'header' });
        await hooks.afterChange?.[0]?.({
            doc: { tenant: 't1', id: 'h1' } as never,
            previousDoc: undefined as never,
            collection: { slug: 'header' } as never,
            operation: 'update',
            req: {} as never,
            context: {} as never,
        });
        expect(revalidateTag).toHaveBeenCalledWith('cms.t1.header.h1', 'max');
    });

    it('uses shopifyHandle as the key for productMetadata / collectionMetadata', async () => {
        vi.mocked(revalidateTag).mockClear();
        const hooks = buildRevalidateHooks({ collection: 'productMetadata' });
        await hooks.afterChange?.[0]?.({
            doc: { shopifyHandle: 'sweet-treats', tenant: 't1', id: 'pm1' } as never,
            previousDoc: undefined as never,
            collection: { slug: 'productMetadata' } as never,
            operation: 'create',
            req: {} as never,
            context: {} as never,
        });
        expect(revalidateTag).toHaveBeenCalledWith('cms.t1.productMetadata.sweet-treats', 'max');
        expect(revalidateTag).toHaveBeenCalledWith('cms.t1.productMetadata', 'max');
        expect(revalidateTag).toHaveBeenCalledWith('cms.t1', 'max');
    });

    it('extracts tenant id from a populated tenant relation object', async () => {
        vi.mocked(revalidateTag).mockClear();
        const hooks = buildRevalidateHooks({ collection: 'pages' });
        await hooks.afterChange?.[0]?.({
            doc: { slug: 'home', tenant: { id: 'shop-1' }, id: 'd1' } as never,
            previousDoc: undefined as never,
            collection: { slug: 'pages' } as never,
            operation: 'update',
            req: {} as never,
            context: {} as never,
        });
        expect(revalidateTag).toHaveBeenCalledWith('cms.shop-1.pages.home', 'max');
        expect(revalidateTag).toHaveBeenCalledWith('cms.shop-1.pages', 'max');
        expect(revalidateTag).toHaveBeenCalledWith('cms.shop-1', 'max');
    });

    it('no-ops when the doc has no tenant (defensive: should never happen in prod)', async () => {
        vi.mocked(revalidateTag).mockClear();
        const hooks = buildRevalidateHooks({ collection: 'pages' });
        await hooks.afterChange?.[0]?.({
            doc: { slug: 'orphan', id: 'd1' } as never,
            previousDoc: undefined as never,
            collection: { slug: 'pages' } as never,
            operation: 'update',
            req: {} as never,
            context: {} as never,
        });
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('afterChange returns the unmodified doc (does not silently mutate)', async () => {
        const hooks = buildRevalidateHooks({ collection: 'pages' });
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

    it.each([
        ['pages', 'home'],
        ['articles', 'how-to-do-x'],
        ['header', null],
        ['footer', null],
        ['businessData', null],
    ] as const)('wires the right %s afterChange/afterDelete hook arrays', (collection, slug) => {
        const hooks = buildRevalidateHooks({ collection });
        expect(hooks.afterChange).toHaveLength(1);
        expect(hooks.afterDelete).toHaveLength(1);
        void slug;
    });
});

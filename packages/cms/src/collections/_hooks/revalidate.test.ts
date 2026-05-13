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
});

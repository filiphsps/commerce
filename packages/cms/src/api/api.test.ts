import type { Payload } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import { getArticle } from './get-article';
import { getArticles } from './get-articles';
import { getPage } from './get-page';

// These helpers are thin wrappers around `payload.find` — their value is the
// query SHAPE they build (tenant scoping, slug match, locale, fallback locale,
// depth, limit, sort, draft). The underlying `payload.find` is mocked so we
// don't pay Payload's ~5s boot cost per assertion.

type FindArgs = Parameters<Payload['find']>[0];

const makePayload = (docs: unknown[] = []): { payload: Payload; find: ReturnType<typeof vi.fn> } => {
    const find = vi.fn(async () => ({ docs, totalDocs: docs.length, hasNextPage: false, hasPrevPage: false }));
    return { payload: { find } as unknown as Payload, find };
};

const shop = () => ({ id: 'shop-x', domain: 'x.test', i18n: { defaultLocale: 'en-US' } });

describe('query API', () => {
    describe('getPage', () => {
        it('queries pages by (tenant, slug) with locale + fallback', async () => {
            const { payload, find } = makePayload([{ id: 'p1', title: 'Home EN' }]);
            const page = await getPage({ shop: shop(), locale: { code: 'en-US' }, slug: 'home', __payload: payload });

            expect(page).toMatchObject({ id: 'p1', title: 'Home EN' });
            expect(find).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'pages',
                    where: { and: [{ tenant: { equals: 'shop-x' } }, { slug: { equals: 'home' } }] },
                    locale: 'en-US',
                    fallbackLocale: 'en-US',
                    depth: 2,
                    limit: 1,
                    draft: false,
                }),
            );
        });

        it('returns null when payload finds no doc', async () => {
            const { payload } = makePayload([]);
            const page = await getPage({
                shop: shop(),
                locale: { code: 'en-US' },
                slug: 'does-not-exist',
                __payload: payload,
            });
            expect(page).toBeNull();
        });

        it('forwards draft=true to payload.find', async () => {
            const { payload, find } = makePayload([]);
            await getPage({ shop: shop(), locale: { code: 'en-US' }, slug: 'home', draft: true, __payload: payload });
            expect(find).toHaveBeenCalledWith(expect.objectContaining({ draft: true }));
        });
    });

    describe('getArticle', () => {
        it('queries articles by (tenant, slug)', async () => {
            const { payload, find } = makePayload([{ id: 'a1', author: 'A' }]);
            const article = await getArticle({
                shop: shop(),
                locale: { code: 'en-US' },
                slug: 'hello',
                __payload: payload,
            });

            expect(article).toMatchObject({ author: 'A' });
            expect(find).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'articles',
                    where: { and: [{ tenant: { equals: 'shop-x' } }, { slug: { equals: 'hello' } }] },
                    depth: 2,
                    limit: 1,
                }),
            );
        });
    });

    describe('getArticles', () => {
        it('paginates with tenant scoping and sort by -publishedAt', async () => {
            const { payload, find } = makePayload([{ id: 'a1' }]);
            const list = await getArticles({ shop: shop(), locale: { code: 'en-US' }, limit: 10, __payload: payload });

            expect(list.docs).toHaveLength(1);
            expect(find).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'articles',
                    where: { tenant: { equals: 'shop-x' } },
                    limit: 10,
                    page: 1,
                    sort: '-publishedAt',
                }),
            );
        });

        it('uses `tags.in` (exact match) instead of `contains` when a tag filter is supplied — guards against the ReDoS surface noted inline', async () => {
            const { payload, find } = makePayload([]);
            await getArticles({ shop: shop(), locale: { code: 'en-US' }, tag: 'news', __payload: payload });
            const arg = (find.mock.calls[0]?.[0] ?? {}) as FindArgs;
            expect(arg.where).toEqual({ and: [{ tenant: { equals: 'shop-x' } }, { tags: { in: ['news'] } }] });
        });
    });
});

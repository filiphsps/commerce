import type { OnlineShop } from '@nordcom/commerce-db';
import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { BlogApi, BlogArticleApi, BlogsApi } from '@/api/shopify/blog';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';

vi.mock('@apollo/client', () => ({
    gql: vi.fn(),
}));

const makeApi = (queryMock: ReturnType<typeof vi.fn>): AbstractApi => ({
    query: queryMock as unknown as AbstractApi['query'],
    locale: () => Locale.default,
    shop: () => ({ id: 'mock-shop-id' }) as OnlineShop,
});

describe('api', () => {
    describe('shopify', () => {
        describe('blog', () => {
            describe('BlogsApi', () => {
                it('returns ProviderFetchError when errors are present', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'boom' }] }));
                    const [result, error] = await BlogsApi({ api });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(ProviderFetchError.name);
                });

                it('returns NotFoundError when no blogs are returned', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: { blogs: { edges: [] } }, errors: [] }));
                    const [result, error] = await BlogsApi({ api });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(NotFoundError.name);
                });

                it('returns flattened blogs on success', async () => {
                    const blogNode = { id: 'blog-1', handle: 'news', title: 'News', seo: null, authors: [] };
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: { blogs: { edges: [{ node: blogNode }] } },
                            errors: [],
                        }),
                    );
                    const [result, error] = await BlogsApi({ api });

                    expect(error).toBeUndefined();
                    // flattenConnection is mocked to return the input; check truthy result
                    expect(result).toBeTruthy();
                });
            });

            describe('BlogApi', () => {
                it('returns ProviderFetchError when errors are present', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'err' }] }));
                    const [result, error] = await BlogApi({ api, handle: 'news' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(ProviderFetchError.name);
                });

                it('returns NotFoundError when blogByHandle is null', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: { blogByHandle: null }, errors: [] }));
                    const [result, error] = await BlogApi({ api, handle: 'missing' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(NotFoundError.name);
                });

                it('returns blog data with description extracted from metafield', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                blogByHandle: {
                                    id: 'b1',
                                    handle: 'news',
                                    title: 'News',
                                    description: { value: 'Our news blog' },
                                    seo: null,
                                    articles: { edges: [] },
                                },
                            },
                            errors: [],
                        }),
                    );
                    const [result, error] = await BlogApi({ api, handle: 'news' });

                    expect(error).toBeUndefined();
                    expect(result?.description).toBe('Our news blog');
                    expect(result?.handle).toBe('news');
                });
            });

            describe('BlogArticleApi', () => {
                it('returns ProviderFetchError when errors are present', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'err' }] }));
                    const [result, error] = await BlogArticleApi({ api, handle: 'my-article' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(ProviderFetchError.name);
                });

                it('returns NotFoundError when blogByHandle is null', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: { blogByHandle: null }, errors: [] }));
                    const [result, error] = await BlogArticleApi({ api, handle: 'my-article' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(NotFoundError.name);
                });

                it('returns NotFoundError when articleByHandle is null', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: { blogByHandle: { articleByHandle: null } },
                            errors: [],
                        }),
                    );
                    const [result, error] = await BlogArticleApi({ api, handle: 'my-article' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(NotFoundError.name);
                });

                it('returns article data and strips mce-fragment attributes from contentHtml', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                blogByHandle: {
                                    articleByHandle: {
                                        id: 'a1',
                                        handle: 'my-article',
                                        contentHtml: '<p data-mce-fragment="1">Hello</p>',
                                        publishedAt: '2026-01-01',
                                        title: 'My Article',
                                    },
                                },
                            },
                            errors: [],
                        }),
                    );
                    const [result, error] = await BlogArticleApi({ api, handle: 'my-article' });

                    expect(error).toBeUndefined();
                    // The regex strips the attribute value, leaving a trailing space before the closing >
                    expect(result?.contentHtml).not.toContain('data-mce-fragment');
                    expect(result?.contentHtml).toContain('Hello');
                });
            });
        });
    });
});

import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';
import { ShopifyPageApi, ShopifyPagesApi } from '@/api/shopify/page';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';

// Override the global `flattenConnection` passthrough mock from `vitest.setup.ts`
// with the real implementation so that pagination tests below exercise the
// connection-shape (`edges`/`pageInfo`) input the production code expects.
vi.mock('@shopify/hydrogen-react', async () => {
    const actual = (await vi.importActual('@shopify/hydrogen-react')) as Record<string, unknown>;
    return {
        ...actual,
        createStorefrontClient: () => ({
            getStorefrontApiUrl: () => '',
            getPublicTokenHeaders: () => ({}),
        }),
        useCart: vi.fn().mockReturnValue({ status: 'idle' }),
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

const makePageNode = (handle: string) => ({
    id: `gid://shopify/Page/${handle}`,
    handle,
    title: `Page ${handle}`,
    body: '<p>html body</p>',
    bodySummary: 'plain text summary',
    seo: { title: 'SEO Title', description: 'SEO Description' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    onlineStoreUrl: 'https://example.com/pages/about',
});

const mockApi = (
    queryMock: ReturnType<typeof vi.fn> = vi.fn(),
    shop: Partial<OnlineShop> = { id: 'mock-shop-id' },
): AbstractApi => ({
    query: queryMock as unknown as AbstractApi['query'],
    locale: () => Locale.default,
    shop: () => shop as OnlineShop,
});

describe('api', () => {
    describe('shopify', () => {
        describe('page', () => {
            describe('ShopifyPageApi', () => {
                it('returns InvalidHandleError when handle is empty', async () => {
                    const api = mockApi();
                    const [result, error] = await ShopifyPageApi({ api, handle: '' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(InvalidHandleError.name);
                });

                it('returns NotFoundError when data.page is null', async () => {
                    const queryMock = vi.fn().mockResolvedValue({ data: { page: null }, errors: [] });
                    const api = mockApi(queryMock);

                    const [result, error] = await ShopifyPageApi({ api, handle: 'missing' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(NotFoundError.name);
                });

                it('returns ProviderFetchError when errors is non-empty', async () => {
                    const queryMock = vi
                        .fn()
                        .mockResolvedValue({ data: null, errors: [{ message: 'something broke' }] });
                    const api = mockApi(queryMock);

                    const [result, error] = await ShopifyPageApi({ api, handle: 'about' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(ProviderFetchError.name);
                });

                it('returns the normalized page when found', async () => {
                    const queryMock = vi.fn().mockResolvedValue({ data: { page: makePageNode('about') }, errors: [] });
                    const api = mockApi(queryMock);

                    const [result, error] = await ShopifyPageApi({ api, handle: 'about' });

                    expect(error).toBeUndefined();
                    expect(result).toEqual({
                        id: 'gid://shopify/Page/about',
                        handle: 'about',
                        title: 'Page about',
                        body: '<p>html body</p>',
                        bodySummary: 'plain text summary',
                        seo: { title: 'SEO Title', description: 'SEO Description' },
                        createdAt: '2026-01-01T00:00:00Z',
                        updatedAt: '2026-01-02T00:00:00Z',
                        onlineStoreUrl: 'https://example.com/pages/about',
                    });
                });

                it('passes the handle as a query variable', async () => {
                    const queryMock = vi.fn().mockResolvedValue({ data: { page: makePageNode('about') }, errors: [] });
                    const api = mockApi(queryMock);

                    await ShopifyPageApi({ api, handle: 'about' });

                    expect(queryMock).toHaveBeenCalledTimes(1);
                    expect(queryMock.mock.calls[0]?.[1]).toMatchObject({ handle: 'about' });
                });
            });

            describe('ShopifyPagesApi', () => {
                it('returns an empty array when no pages exist', async () => {
                    const queryMock = vi.fn().mockResolvedValue({
                        data: { pages: { edges: [], pageInfo: { hasNextPage: false } } },
                        errors: [],
                    });
                    const api = mockApi(queryMock);

                    const [result, error] = await ShopifyPagesApi({ api });

                    expect(error).toBeUndefined();
                    expect(result).toEqual([]);
                });

                it('returns flattened pages on a single page of results', async () => {
                    const queryMock = vi.fn().mockResolvedValue({
                        data: {
                            pages: {
                                edges: [
                                    { cursor: 'c1', node: makePageNode('about') },
                                    { cursor: 'c2', node: makePageNode('faq') },
                                ],
                                pageInfo: { hasNextPage: false },
                            },
                        },
                        errors: [],
                    });
                    const api = mockApi(queryMock);

                    const [result, error] = await ShopifyPagesApi({ api });

                    expect(error).toBeUndefined();
                    expect(result).toHaveLength(2);
                    expect(result?.[0]?.handle).toBe('about');
                    expect(result?.[1]?.handle).toBe('faq');
                });

                it('paginates via cursor when hasNextPage', async () => {
                    const queryMock = vi
                        .fn()
                        .mockResolvedValueOnce({
                            data: {
                                pages: {
                                    edges: [{ cursor: 'c1', node: makePageNode('about') }],
                                    pageInfo: { hasNextPage: true },
                                },
                            },
                            errors: [],
                        })
                        .mockResolvedValueOnce({
                            data: {
                                pages: {
                                    edges: [{ cursor: 'c2', node: makePageNode('faq') }],
                                    pageInfo: { hasNextPage: false },
                                },
                            },
                            errors: [],
                        });
                    const api = mockApi(queryMock);

                    const [result, error] = await ShopifyPagesApi({ api });

                    expect(error).toBeUndefined();
                    expect(result).toHaveLength(2);
                    expect(queryMock).toHaveBeenCalledTimes(2);
                    expect(queryMock.mock.calls[1]?.[1]).toMatchObject({ after: 'c1' });
                });

                it('returns ProviderFetchError when errors is non-empty', async () => {
                    const queryMock = vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'boom' }] });
                    const api = mockApi(queryMock);

                    const [result, error] = await ShopifyPagesApi({ api });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(ProviderFetchError.name);
                });
            });
        });
    });
});

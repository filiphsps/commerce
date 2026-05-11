import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';
import { ShopifyPageApi } from '@/api/shopify/page';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';

const makePageNode = (handle: string) => ({
    id: `gid://shopify/Page/${handle}`,
    handle,
    title: `Page ${handle}`,
    body: 'plain text body',
    bodyHtml: '<p>html body</p>',
    seo: { title: 'SEO Title', description: 'SEO Description' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    onlineStoreUrl: 'https://example.com/pages/about',
});

const mockApi = (
    queryMock: ReturnType<typeof vi.fn> = vi.fn(),
    shop: Partial<OnlineShop> = { id: 'mock-shop-id' },
): AbstractApi => ({
    query: queryMock,
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
                        body: 'plain text body',
                        bodyHtml: '<p>html body</p>',
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
        });
    });
});

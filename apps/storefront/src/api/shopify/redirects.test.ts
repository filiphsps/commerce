import type { OnlineShop } from '@nordcom/commerce-db';
import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { RedirectApi, RedirectsApi } from '@/api/shopify/redirects';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';

vi.mock('@apollo/client', () => ({
    gql: vi.fn(),
}));

// Override global flattenConnection passthrough with an implementation that
// extracts nodes from the edges array, matching the real hydrogen-react shape.
vi.mock('@shopify/hydrogen-react', async () => {
    const actual = (await vi.importActual('@shopify/hydrogen-react')) as Record<string, unknown>;
    return {
        ...actual,
        flattenConnection: vi.fn().mockImplementation((connection: { edges: { node: unknown }[] }) =>
            connection.edges.map((e) => e.node),
        ),
        createStorefrontClient: () => ({
            getStorefrontApiUrl: () => '',
            getPublicTokenHeaders: () => ({}),
        }),
    };
});

const makeApi = (queryMock: ReturnType<typeof vi.fn>): AbstractApi => ({
    query: queryMock as unknown as AbstractApi['query'],
    locale: () => Locale.default,
    shop: () => ({ id: 'mock-shop-id' }) as OnlineShop,
});

describe('api', () => {
    describe('shopify', () => {
        describe('redirects', () => {
            describe('RedirectsApi', () => {
                it('throws ProviderFetchError when errors are present', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'boom' }] }));

                    await expect(RedirectsApi({ api })).rejects.toMatchObject({ name: ProviderFetchError.name });
                });

                it('throws NotFoundError when redirects list is empty and no prior redirects', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                urlRedirects: {
                                    edges: [],
                                    pageInfo: { hasNextPage: false },
                                },
                            },
                            errors: [],
                        }),
                    );

                    await expect(RedirectsApi({ api })).rejects.toMatchObject({ name: NotFoundError.name });
                });

                it('returns redirects with normalized lower-case paths and targets', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                urlRedirects: {
                                    edges: [
                                        {
                                            cursor: 'c1',
                                            node: { id: 'r1', path: '/Old-Path', target: '/New-Target' },
                                        },
                                    ],
                                    pageInfo: { hasNextPage: false },
                                },
                            },
                            errors: [],
                        }),
                    );

                    const result = await RedirectsApi({ api });

                    expect(result[0]?.path).toBe('/old-path');
                    expect(result[0]?.target).toBe('/new-target');
                });
            });

            describe('RedirectApi', () => {
                it('returns null when no redirect is found for the path', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                urlRedirects: {
                                    edges: [
                                        {
                                            cursor: 'c1',
                                            node: { id: 'r1', path: '/something-else', target: '/target' },
                                        },
                                    ],
                                    pageInfo: { hasNextPage: false },
                                },
                            },
                            errors: [],
                        }),
                    );

                    const result = await RedirectApi({ api, path: '/not-found' });

                    expect(result).toBeNull();
                });

                it('returns target when a direct query match is found', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                urlRedirects: {
                                    edges: [
                                        {
                                            cursor: 'c1',
                                            node: { id: 'r1', path: '/my-path', target: '/my-target' },
                                        },
                                    ],
                                    pageInfo: { hasNextPage: false },
                                },
                            },
                            errors: [],
                        }),
                    );

                    const result = await RedirectApi({ api, path: '/my-path' });

                    expect(result).toBe('/my-target');
                });
            });
        });
    });
});

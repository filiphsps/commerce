import { ApolloClient } from '@apollo/client';

import { describe, expect, it, vi } from 'vitest';
import { ApiBuilder } from '@/utils/abstract-api';
import type { Locale } from '@/utils/locale';

vi.mock('@apollo/client', async () => ({
    ...((await vi.importActual('@apollo/client')) as any),
    ApolloClient: vi.fn().mockImplementation(function () {
        return {
            query: vi.fn().mockResolvedValue({
                data: {
                    product: {
                        id: '123',
                        title: 'Fake Product',
                    },
                },
                errors: undefined,
            }),
            mutate: vi.fn().mockResolvedValue({
                data: {
                    cartCreate: {
                        cart: { id: 'gid://shopify/Cart/new' },
                        userErrors: [],
                    },
                },
                errors: undefined,
            }),
        };
    }),
}));

describe('utils', () => {
    describe('ApiBuilder', () => {
        // Mock apollo client.
        const client = new ApolloClient({
            uri: 'https://fake-shopify-store.com/graphql',
        } as any);

        const locale = {
            code: 'en-US',
            language: 'EN',
            country: 'US',
        } as Locale;

        const api = ApiBuilder({
            shop: { id: 'shop-123', domain: 'demo.myshopify.com' } as any,
            api: client,
            locale,
        });

        it('should return the correct locale', () => {
            expect(api.locale()).toEqual(locale);
        });

        it('should return the correct data', async () => {
            const query = `
                query GetProduct($id: ID!) {
                    product(id: $id) {
                        id
                        title
                    }
                }
            `;

            const { data, errors } = await api.query<{ product: { id: string; title: string } }>(query as any);

            expect(errors).toBeUndefined();
            expect(data?.product.id).toBe('123');
            expect(data?.product.title).toBe('Fake Product');
        });

        it('mutate forwards mutation + variables to the apollo client and returns data', async () => {
            const mutation = `
                mutation CartCreate($input: CartInput!) {
                    cartCreate(input: $input) {
                        cart { id }
                        userErrors { field message }
                    }
                }
            `;

            const { data, errors } = await api.mutate<{
                cartCreate: { cart: { id: string }; userErrors: unknown[] };
            }>(mutation as any, { input: { lines: [] } });

            expect(errors).toBeUndefined();
            expect(data?.cartCreate.cart.id).toBe('gid://shopify/Cart/new');
            expect((client as any).mutate).toHaveBeenCalledWith(
                expect.objectContaining({
                    mutation,
                    variables: expect.objectContaining({
                        language: 'EN',
                        country: 'US',
                        input: { lines: [] },
                    }),
                }),
            );
        });
    });

    describe('ApiBuilder — fetch cache policy', () => {
        const DOC = {} as any;

        const makeApi = () => {
            const client = new ApolloClient({ uri: 'https://fake.example.com/graphql' } as any) as any;
            const api = ApiBuilder({
                shop: { id: 'shop-1', domain: 'demo.myshopify.com' } as any,
                api: client,
                locale: { code: 'en-US', language: 'EN', country: 'US' } as Locale,
            });
            return { client, api };
        };

        it('defaults to cached: omits `cache` so the 8h revalidate floor + tags govern the fetch', async () => {
            const { client, api } = makeApi();
            await api.query(DOC, { handle: 'h1' }, { tags: ['shopify.shop-1.product.h1'] });

            const { fetchOptions } = client.query.mock.calls[0][0].context;
            // No explicit cache → Next.js uses next.revalidate/tags. A `cache:
            // 'no-store'` here was the bug: it overrode the link revalidate and
            // made every read uncached.
            expect('cache' in fetchOptions).toBe(false);
            expect(fetchOptions.next.revalidate).toBe(28_800);
            expect(fetchOptions.next.tags).toEqual(
                expect.arrayContaining(['shopify', 'shopify.shop-1', 'shopify.shop-1.product.h1']),
            );
        });

        it('fetchPolicy `no-store` opts out: sets cache no-store and drops revalidate', async () => {
            const { client, api } = makeApi();
            await api.query(DOC, {}, { fetchPolicy: 'no-store' });

            const { fetchOptions } = client.query.mock.calls[0][0].context;
            expect(fetchOptions.cache).toBe('no-store');
            // Next.js forbids pairing `cache: 'no-store'` with `next.revalidate`.
            expect(fetchOptions.next.revalidate).toBeUndefined();
            expect(fetchOptions.next.tags).toEqual(expect.arrayContaining(['shopify']));
        });

        it('honors an explicit non-no-store fetchPolicy while keeping the revalidate floor', async () => {
            const { client, api } = makeApi();
            await api.query(DOC, {}, { fetchPolicy: 'no-cache' });

            const { fetchOptions } = client.query.mock.calls[0][0].context;
            expect(fetchOptions.cache).toBe('no-cache');
            expect(fetchOptions.next.revalidate).toBe(28_800);
        });

        it('dynamic `no-store` reads also bypass Apollo InMemoryCache via fetchPolicy `no-cache`', async () => {
            const { client, api } = makeApi();
            await api.query(DOC, {}, { fetchPolicy: 'no-store' });

            // The pooled Apollo client defaults to `cache-first`; without this a
            // per-buyer cart read could be served stale from the normalized cache.
            expect(client.query.mock.calls[0][0].fetchPolicy).toBe('no-cache');
        });

        it('cached reads leave Apollo on its default fetchPolicy (no top-level override)', async () => {
            const { client, api } = makeApi();
            await api.query(DOC, {});

            expect('fetchPolicy' in client.query.mock.calls[0][0]).toBe(false);
        });

        it('honors a caller-supplied revalidate override', async () => {
            const { client, api } = makeApi();
            await api.query(DOC, {}, { revalidate: 60 });

            const { fetchOptions } = client.query.mock.calls[0][0].context;
            expect(fetchOptions.next.revalidate).toBe(60);
        });

        it('mutate stays uncached: cache no-store with an empty next (no revalidate conflict)', async () => {
            const { client, api } = makeApi();
            await api.mutate(DOC, {});

            const { fetchOptions } = client.mutate.mock.calls[0][0].context;
            expect(fetchOptions.cache).toBe('no-store');
            expect(fetchOptions.next).toEqual({});
        });
    });
});

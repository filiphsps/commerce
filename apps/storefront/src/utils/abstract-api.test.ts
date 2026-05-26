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
});

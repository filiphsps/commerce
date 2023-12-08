import { ApiBuilder } from '@/utils/abstract-api';
import type { Locale } from '@/utils/locale';
import { ApolloClient } from '@apollo/client';
import { describe, expect, it, vi } from 'vitest';

describe('utils', () => {
    vi.mock('@apollo/client', async () => ({
        ...(await vi.importActual('@apollo/client')),
        ApolloClient: vi.fn().mockReturnValue({
            query: vi.fn().mockResolvedValue({
                data: {
                    product: {
                        id: '123',
                        title: 'Fake Product'
                    }
                },
                errors: undefined
            })
        })
    }));
    describe('ApiBuilder', () => {
        // Mock apollo client.
        const client = new ApolloClient({
            uri: 'https://fake-shopify-store.com/graphql'
        } as any);

        const locale = {
            locale: 'en-US',
            language: 'EN',
            country: 'US'
        } as Locale;

        const api = ApiBuilder({
            shop: {} as any,
            api: client,
            locale
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
    });
});

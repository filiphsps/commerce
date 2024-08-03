import { describe, expect, it, vi } from 'vitest';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ApiBuilder, buildCacheTagArray } from '@/utils/abstract-api';
import { ApolloClient } from '@apollo/client';

import type { Locale } from '@/utils/locale';

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

    describe('buildCacheTagArray', () => {
        it('should build the cache tag array correctly', () => {
            const shop = {
                id: 'id',
                domain: 'domain'
            } as OnlineShop;

            const locale = {
                code: 'en-US'
            } as Locale;

            const tags = ['tag1', 'tag2'];

            const expectedCacheTags = ['id', 'domain', 'domain.en-US', 'domain.en-US.tag1', 'domain.en-US.tag2'];

            const cacheTags = buildCacheTagArray(shop, locale, tags);

            expect(cacheTags).toEqual(expectedCacheTags);
        });
    });
});

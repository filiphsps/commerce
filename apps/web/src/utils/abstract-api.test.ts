import { ApiBuilder, buildCacheTagArray } from '@/utils/abstract-api';
import type { Locale } from '@/utils/locale';
import { ApolloClient } from '@apollo/client';
import type { Shop } from '@nordcom/commerce-database';
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

    describe('buildCacheTagArray', () => {
        it('should build the cache tag array correctly with env', () => {
            const shop = {
                id: '123'
            } as Shop;

            const locale = {
                code: 'en-US'
            } as Locale;

            const tags = ['tag1', 'tag2'];

            const env = 'dev';

            const expectedCacheTags = [
                'dev',
                'dev.tag1',
                'dev.tag2',
                '123dev',
                '123.en-USdev',
                '123.en-US.dev.tag1',
                '123.en-US.dev.tag2'
            ];

            const cacheTags = buildCacheTagArray(shop, locale, tags, env);

            expect(cacheTags).toEqual(expectedCacheTags);
        });

        it('should build the cache tag array correctly without env', () => {
            const shop = {
                id: '123'
            } as Shop;

            const locale = {
                code: 'en-US'
            } as Locale;

            const tags = ['tag1', 'tag2'];

            const expectedCacheTags = ['tag1', 'tag2', '123', '123.en-US', '123.en-US.tag1', '123.en-US.tag2'];

            const cacheTags = buildCacheTagArray(shop, locale, tags);

            expect(cacheTags).toEqual(expectedCacheTags);
        });
    });
});

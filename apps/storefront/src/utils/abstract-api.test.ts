import { ApolloClient } from '@apollo/client';

import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it, vi } from 'vitest';
import { ApiBuilder, buildCacheTagArray } from '@/utils/abstract-api';
import { mockLocale } from '@/utils/test/fixtures/locale';
import { mockShop } from '@/utils/test/fixtures/shop';

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
            shop: {} as any,
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
    });

    describe('buildCacheTagArray', () => {
        it('should build the cache tag array correctly', () => {
            const shop = {
                id: 'id',
                domain: 'domain',
            } as OnlineShop;

            const locale = {
                code: 'en-US',
            } as Locale;

            const tags = ['tag1', 'tag2'];

            const expectedCacheTags = ['shopify', 'shopify.id', 'domain', 'en-US', 'tag1', 'tag2'];

            const cacheTags = buildCacheTagArray(shop, locale, tags);

            expect(cacheTags).toEqual(expectedCacheTags);
        });

        it('always includes shopify, shopify.<shopId>, <domain>, and <localeCode> base tags', () => {
            const shop = mockShop();
            const locale = mockLocale('en-US');

            const result = buildCacheTagArray(shop, locale, []);

            expect(result).toContain('shopify');
            expect(result).toContain(`shopify.${shop.id}`);
            expect(result).toContain(shop.domain);
            expect(result).toContain(locale.code);
        });

        it('prepends base tags before per-entity tags', () => {
            const shop = mockShop();
            const locale = mockLocale('sv-SE');
            const entityTags = ['shopify.mock-shop-id.product.my-product', 'product', 'my-product'];

            const result = buildCacheTagArray(shop, locale, entityTags);

            expect(result.slice(0, 4)).toEqual(['shopify', `shopify.${shop.id}`, shop.domain, 'sv-SE']);
            expect(result).toEqual(expect.arrayContaining(entityTags));
        });

        it('appends per-entity tags when provided', () => {
            const shop = mockShop();
            const locale = mockLocale('de-DE');
            const entityTags = [`shopify.${shop.id}.collection.summer`, 'collection', 'summer'];

            const result = buildCacheTagArray(shop, locale, entityTags);

            expect(result).toContain(`shopify.${shop.id}.collection.summer`);
            expect(result).toContain('collection');
            expect(result).toContain('summer');
        });

        it('returns only the four base tags when no per-entity tags are passed', () => {
            const shop = mockShop();
            const locale = mockLocale();

            const result = buildCacheTagArray(shop, locale, []);

            expect(result).toHaveLength(4);
            expect(result).toEqual(['shopify', `shopify.${shop.id}`, shop.domain, locale.code]);
        });
    });
});

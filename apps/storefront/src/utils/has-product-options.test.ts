import { describe, expect, it } from 'vitest';
import type { Product } from '@/api/product';
import { hasProductOptions } from '@/utils/has-product-options';

describe('utils', () => {
    describe('hasProductOptions', () => {
        it(`should return false when given no product`, () => {
            const result = hasProductOptions();
            expect(result).toEqual(false);
        });

        it(`should return false when the product has no options`, () => {
            const product = {} as Product;

            const result = hasProductOptions(product);
            expect(result).toEqual(false);
        });

        it(`should return false when the product options array is empty`, () => {
            const product = { options: [] } as unknown as Product;

            const result = hasProductOptions(product);
            expect(result).toEqual(false);
        });

        it(`should return false when the product only has Shopify's "Default Title" placeholder`, () => {
            const product = {
                options: [
                    {
                        id: 'gid://shopify/ProductOption/1',
                        name: 'Title',
                        values: ['Default Title'],
                    },
                ],
            } as unknown as Product;

            const result = hasProductOptions(product);
            expect(result).toEqual(false);
        });

        it(`should return false when the product has a single option with a single value`, () => {
            const product = {
                options: [
                    {
                        id: 'gid://shopify/ProductOption/1',
                        name: 'Color',
                        values: ['Red'],
                    },
                ],
            } as unknown as Product;

            const result = hasProductOptions(product);
            expect(result).toEqual(false);
        });

        it(`should return true when the product has a single option with multiple values`, () => {
            const product = {
                options: [
                    {
                        id: 'gid://shopify/ProductOption/1',
                        name: 'Size',
                        values: ['S', 'M', 'L'],
                    },
                ],
            } as unknown as Product;

            const result = hasProductOptions(product);
            expect(result).toEqual(true);
        });

        it(`should return true when the product has multiple options`, () => {
            const product = {
                options: [
                    {
                        id: 'gid://shopify/ProductOption/1',
                        name: 'Size',
                        values: ['S', 'M'],
                    },
                    {
                        id: 'gid://shopify/ProductOption/2',
                        name: 'Color',
                        values: ['Red', 'Blue'],
                    },
                ],
            } as unknown as Product;

            const result = hasProductOptions(product);
            expect(result).toEqual(true);
        });

        it(`should ignore the "Default Title" placeholder when other real options exist`, () => {
            const product = {
                options: [
                    {
                        id: 'gid://shopify/ProductOption/1',
                        name: 'Title',
                        values: ['Default Title'],
                    },
                    {
                        id: 'gid://shopify/ProductOption/2',
                        name: 'Size',
                        values: ['S', 'M', 'L'],
                    },
                ],
            } as unknown as Product;

            const result = hasProductOptions(product);
            expect(result).toEqual(true);
        });
    });
});

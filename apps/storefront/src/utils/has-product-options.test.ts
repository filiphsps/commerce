import { describe, expect, it } from 'vitest';
import type { Product } from '@/api/product';
import { filterRealOptions, hasProductOptions } from '@/utils/has-product-options';

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

    describe('filterRealOptions', () => {
        it(`should return an empty array when given undefined`, () => {
            expect(filterRealOptions(undefined)).toEqual([]);
        });

        it(`should return an empty array when given null`, () => {
            expect(filterRealOptions(null)).toEqual([]);
        });

        it(`should strip the Shopify "Default Title" placeholder (legacy values shape)`, () => {
            const options = [
                { id: '1', name: 'Title', values: ['Default Title'] },
                { id: '2', name: 'Size', values: ['S', 'M', 'L'] },
            ] as any;
            const result = filterRealOptions(options);
            expect(result.length).toEqual(1);
            expect(result[0]!.name).toEqual('Size');
        });

        it(`should strip the placeholder on the mapped optionValues shape`, () => {
            const options = [
                {
                    id: '1',
                    name: 'Title',
                    optionValues: [{ name: 'Default Title', available: true }],
                },
                {
                    id: '2',
                    name: 'Size',
                    optionValues: [
                        { name: 'S', available: true },
                        { name: 'M', available: true },
                    ],
                },
            ] as any;
            const result = filterRealOptions(options);
            expect(result.length).toEqual(1);
            expect(result[0]!.name).toEqual('Size');
        });

        it(`should preserve options with multiple values even if one is "default title"`, () => {
            const options = [{ id: '1', name: 'Size', values: ['Default Title', 'M'] }] as any;
            const result = filterRealOptions(options);
            expect(result.length).toEqual(1);
        });

        it(`should handle missing values arrays`, () => {
            const options = [
                { id: '1', name: 'Size' },
                { id: '2', name: 'Color', values: ['Red'] },
            ] as any;
            const result = filterRealOptions(options);
            expect(result.length).toEqual(1);
            expect(result[0]!.name).toEqual('Color');
        });

        it(`should prefer optionValues when both shapes are present`, () => {
            const options = [
                {
                    id: '1',
                    name: 'Title',
                    // Legacy shape would be filtered (single Default Title).
                    values: ['Default Title'],
                    // But new shape has real choices — should be kept.
                    optionValues: [{ name: 'A' }, { name: 'B' }],
                },
            ] as any;
            const result = filterRealOptions(options);
            expect(result.length).toEqual(1);
        });
    });
});

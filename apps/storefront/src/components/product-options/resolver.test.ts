import { describe, expect, it } from 'vitest';
import { findVariant, resolveOptions, toSelectionRecord } from './resolver';

const fakeProduct = (overrides = {}) =>
    ({
        handle: 'hoodie',
        options: [
            {
                name: 'Color',
                values: ['Red', 'Green', 'Blue'],
                optionValues: [
                    { name: 'Red', swatch: { color: '#ff0000' } },
                    { name: 'Green', swatch: { color: '#00ff00' } },
                    { name: 'Blue', swatch: { color: '#0000ff' } },
                ],
            },
            {
                name: 'Size',
                values: ['S', 'M', 'L'],
                optionValues: [{ name: 'S' }, { name: 'M' }, { name: 'L' }],
            },
        ],
        variants: {
            edges: [
                {
                    node: {
                        id: 'v1',
                        availableForSale: true,
                        selectedOptions: [
                            { name: 'Color', value: 'Red' },
                            { name: 'Size', value: 'S' },
                        ],
                    },
                },
                {
                    node: {
                        id: 'v2',
                        availableForSale: false,
                        selectedOptions: [
                            { name: 'Color', value: 'Red' },
                            { name: 'Size', value: 'M' },
                        ],
                    },
                },
                {
                    node: {
                        id: 'v3',
                        availableForSale: true,
                        selectedOptions: [
                            { name: 'Color', value: 'Green' },
                            { name: 'Size', value: 'S' },
                        ],
                    },
                },
            ],
        },
        ...overrides,
    }) as any;

describe('resolveOptions', () => {
    it('returns one entry per real option, omitting the Shopify "Title" placeholder', () => {
        const product = fakeProduct({
            options: [
                { name: 'Title', values: ['Default Title'], optionValues: [{ name: 'Default Title' }] },
                { name: 'Color', values: ['Red'], optionValues: [{ name: 'Red' }] },
            ],
        });
        const resolved = resolveOptions(product, {});
        expect(resolved.map((o) => o.name)).toEqual(['Color']);
    });

    it('marks the selected value', () => {
        const resolved = resolveOptions(fakeProduct(), { Color: 'Red', Size: 'S' });
        expect(resolved[0]!.values[0]!.selected).toBe(true);
        expect(resolved[0]!.values[1]!.selected).toBe(false);
    });

    it('derives availability based on the variant matrix', () => {
        const resolved = resolveOptions(fakeProduct(), { Color: 'Red', Size: 'S' });
        const size = resolved.find((o) => o.name === 'Size')!;
        expect(size.values.find((v) => v.name === 'S')!.available).toBe(true);
        expect(size.values.find((v) => v.name === 'M')!.available).toBe(false);
        expect(size.values.find((v) => v.name === 'L')!.available).toBe(false);
    });

    it('derives availability cross-axis for the other option when one is selected', () => {
        // With Size=S selected, the Color option should reflect availability
        // for variants where Size=S is preserved:
        //   Red+S → v1 available → Red: available
        //   Green+S → v3 available → Green: available
        //   Blue+S → no variant → Blue: unavailable
        const resolved = resolveOptions(fakeProduct(), { Size: 'S' });
        const color = resolved.find((o) => o.name === 'Color')!;
        expect(color.values.find((v) => v.name === 'Red')!.available).toBe(true);
        expect(color.values.find((v) => v.name === 'Green')!.available).toBe(true);
        expect(color.values.find((v) => v.name === 'Blue')!.available).toBe(false);
    });

    it('returns swatch as undefined when raw swatch has neither color nor image', () => {
        const product = fakeProduct({
            options: [
                {
                    name: 'Material',
                    values: ['Cotton'],
                    optionValues: [{ name: 'Cotton', swatch: {} }],
                },
            ],
            variants: {
                edges: [
                    {
                        node: {
                            id: 'vm1',
                            availableForSale: true,
                            selectedOptions: [{ name: 'Material', value: 'Cotton' }],
                        },
                    },
                ],
            },
        });
        const resolved = resolveOptions(product, {});
        expect(resolved[0]!.values[0]!.swatch).toBeUndefined();
    });

    it('normalizes swatch.color through directly', () => {
        const resolved = resolveOptions(fakeProduct(), {});
        const color = resolved.find((o) => o.name === 'Color')!;
        expect(color.values[0]!.swatch?.color).toBe('#ff0000');
    });

    it('normalizes swatch.image from previewImage nesting', () => {
        const product = fakeProduct({
            options: [
                {
                    name: 'Pattern',
                    values: ['Floral'],
                    optionValues: [
                        {
                            name: 'Floral',
                            swatch: {
                                image: {
                                    previewImage: {
                                        url: 'https://cdn/floral.png',
                                        altText: 'Floral',
                                        width: 100,
                                        height: 100,
                                    },
                                },
                            },
                        },
                    ],
                },
            ],
            variants: {
                edges: [
                    {
                        node: {
                            id: 'vp1',
                            availableForSale: true,
                            selectedOptions: [{ name: 'Pattern', value: 'Floral' }],
                        },
                    },
                ],
            },
        });
        const resolved = resolveOptions(product, {});
        expect(resolved[0]!.values[0]!.swatch?.image?.url).toBe('https://cdn/floral.png');
    });

    it('falls back to legacy option.values strings when optionValues is missing', () => {
        const product = fakeProduct({
            options: [{ name: 'Color', values: ['Red', 'Green'] }],
            variants: { edges: [] },
        });
        const resolved = resolveOptions(product, {});
        expect(resolved[0]!.values.map((v) => v.name)).toEqual(['Red', 'Green']);
        expect(resolved[0]!.values[0]!.swatch).toBeUndefined();
    });
});

describe('findVariant', () => {
    it('finds the matching variant', () => {
        const v = findVariant(fakeProduct(), { Color: 'Red', Size: 'S' });
        expect(v?.id).toBe('v1');
    });

    it('returns undefined when no variant matches the full selection', () => {
        const v = findVariant(fakeProduct(), { Color: 'Blue', Size: 'L' });
        expect(v).toBeUndefined();
    });
});

describe('toSelectionRecord', () => {
    it('returns an empty object when variant is undefined', () => {
        expect(toSelectionRecord(undefined)).toEqual({});
    });

    it('serializes selectedOptions into a name→value record', () => {
        expect(
            toSelectionRecord({
                selectedOptions: [
                    { name: 'Color', value: 'Red' },
                    { name: 'Size', value: 'M' },
                ],
            } as any),
        ).toEqual({ Color: 'Red', Size: 'M' });
    });
});

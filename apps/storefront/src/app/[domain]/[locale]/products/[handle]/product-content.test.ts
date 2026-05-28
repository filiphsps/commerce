import { describe, expect, it } from 'vitest';
import { resolveInitialVariantId } from './product-content';

const v1 = {
    id: 'gid://shopify/ProductVariant/1',
    availableForSale: true,
    selectedOptions: [
        { name: 'Color', value: 'Red' },
        { name: 'Size', value: 'M' },
    ],
};
const v2 = {
    id: 'gid://shopify/ProductVariant/2',
    availableForSale: true,
    selectedOptions: [
        { name: 'Color', value: 'Blue' },
        { name: 'Size', value: 'M' },
    ],
};
const v3 = {
    id: 'gid://shopify/ProductVariant/3',
    availableForSale: true,
    selectedOptions: [
        { name: 'Color', value: 'Red' },
        { name: 'Size', value: 'L' },
    ],
};

const product = {
    handle: 'tee',
    options: [
        { name: 'Color', values: ['Red', 'Blue'] },
        { name: 'Size', values: ['M', 'L'] },
    ],
    selectedOrFirstAvailableVariant: v1,
    variants: {
        edges: [{ node: v1 }, { node: v2 }, { node: v3 }],
    },
} as any;

describe('resolveInitialVariantId', () => {
    it('reads ?variant param when present (numeric ID)', () => {
        const params = new URLSearchParams('variant=1');
        expect(resolveInitialVariantId(product, params)).toBe('gid://shopify/ProductVariant/1');
    });

    it('does not double-encode when ?variant param already contains full GID', () => {
        // Link generators sometimes embed the full GID. Without the fix, the result is:
        // gid://shopify/ProductVariant/gid://shopify/ProductVariant/1 — no match → wrong variant.
        const params = new URLSearchParams('variant=gid://shopify/ProductVariant/1');
        expect(resolveInitialVariantId(product, params)).toBe('gid://shopify/ProductVariant/1');
    });

    it('matches variant by option params when ?variant is absent', () => {
        const params = new URLSearchParams('Color=Blue&Size=M');
        expect(resolveInitialVariantId(product, params)).toBe('gid://shopify/ProductVariant/2');
    });

    it('falls back to firstAvailableVariant when option params match nothing', () => {
        const params = new URLSearchParams('Color=Green&Size=XL');
        // No variant matches Green/XL — firstAvailableVariant returns last available (v3)
        expect(resolveInitialVariantId(product, params)).toBe('gid://shopify/ProductVariant/3');
    });

    it('falls back to firstAvailableVariant when no params present', () => {
        const params = new URLSearchParams('');
        // firstAvailableVariant returns last available (v3) per its "most expensive first" heuristic
        expect(resolveInitialVariantId(product, params)).toBe('gid://shopify/ProductVariant/3');
    });
});

import { describe, expect, it } from 'vitest';
import * as ProductDisplay from './index';

describe('product-display public API', () => {
    it('exports the expected primitives', () => {
        expect(Object.keys(ProductDisplay).sort()).toEqual([
            'VariantBadges',
            'VariantImage',
            'VariantPrice',
            'VariantStockUrgency',
            'VariantTitle',
        ]);
    });
});

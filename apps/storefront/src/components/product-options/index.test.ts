import { describe, expect, it } from 'vitest';
import * as ProductOptions from './index';

describe('product-options public API', () => {
    it('exports the expected primitives', () => {
        expect(Object.keys(ProductOptions).sort()).toEqual([
            'Chip',
            'Group',
            'More',
            'Overlay',
            'Root',
            'Swatch',
            'Value',
        ]);
    });
});

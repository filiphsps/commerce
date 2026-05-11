import { describe, expect, it } from 'vitest';
import { mockShop } from '@/utils/test/fixtures/shop';

describe('mockShop', () => {
    it('returns a shop with the default id and domain', () => {
        const shop = mockShop();
        expect(shop.id).toBe('mock-shop-id');
        expect(shop.domain).toBe('staging.demo.nordcom.io');
        expect(shop.commerceProvider.domain).toBe('mock.shop');
    });

    it('merges overrides into the default shape', () => {
        const shop = mockShop({ overrides: { domain: 'custom.example' } });
        expect(shop.domain).toBe('custom.example');
        expect(shop.id).toBe('mock-shop-id');
    });

    it('preserves design accents from defaults when not overridden', () => {
        const shop = mockShop();
        expect(shop.design.accents).toHaveLength(2);
    });
});

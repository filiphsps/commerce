import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';

import { productCardSurfaceForShop } from './extensions';

/** Minimal shop carrying only the manifest fields the resolver reads. */
const shopWith = (productCard: Record<string, unknown>): OnlineShop =>
    ({ extensions: { productCard } }) as unknown as OnlineShop;

describe('productCardSurfaceForShop — per-instance override', () => {
    it('layers the instance override above the per-surface selection', () => {
        const shop = shopWith({
            base: { chrome: 'frameless' },
            collection: { layout: 'horizontal' },
        });
        const resolved = productCardSurfaceForShop(shop, 'collection', { layout: 'vertical' });
        expect(resolved.layout).toBe('vertical'); // instance beats the per-surface 'horizontal'
        expect(resolved.chrome).toBe('frameless'); // base still applies
    });

    it('without an instance override resolves identically to the omitted-arg call', () => {
        const shop = shopWith({ collection: { layout: 'horizontal' } });
        expect(productCardSurfaceForShop(shop, 'collection', undefined)).toEqual(
            productCardSurfaceForShop(shop, 'collection'),
        );
    });
});

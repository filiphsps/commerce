import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';
import { BusinessDataApi } from '@/api/store';
import { Locale } from '@/utils/locale';

const makeShopifyShop = (): OnlineShop =>
    ({
        id: 'shop-1',
        domain: 'shop.example.com',
        contentProvider: { type: 'shopify' },
    }) as unknown as OnlineShop;

describe('api/store', () => {
    describe('BusinessDataApi', () => {
        it('returns null for non-prismic shops', async () => {
            const shop = makeShopifyShop();
            const result = await BusinessDataApi({ shop, locale: Locale.default as Locale });
            expect(result).toBeNull();
        });
    });
});

import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';
import { FooterApi } from '@/api/footer';
import { Locale } from '@/utils/locale';

const makeShopifyShop = (): OnlineShop =>
    ({
        id: 'shop-1',
        domain: 'shop.example.com',
        contentProvider: { type: 'shopify' },
    }) as unknown as OnlineShop;

describe('api/footer', () => {
    describe('FooterApi', () => {
        it('returns null for non-prismic shops', async () => {
            const shop = makeShopifyShop();
            const result = await FooterApi({ shop, locale: Locale.default as unknown as Locale });
            expect(result).toBeNull();
        });
    });
});

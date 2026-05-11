import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';
import { HeaderApi, MenuApi } from '@/api/navigation';
import { Locale } from '@/utils/locale';

const makeShopifyShop = (): OnlineShop =>
    ({
        id: 'shop-1',
        domain: 'shop.example.com',
        contentProvider: { type: 'shopify' },
    }) as unknown as OnlineShop;

describe('api/navigation', () => {
    describe('MenuApi', () => {
        it('returns null for non-prismic shops', async () => {
            const shop = makeShopifyShop();
            const result = await MenuApi({ shop, locale: Locale.default as Locale });
            expect(result).toBeNull();
        });
    });

    describe('HeaderApi', () => {
        it('returns null for non-prismic shops', async () => {
            const shop = makeShopifyShop();
            const result = await HeaderApi({ shop, locale: Locale.default as Locale });
            expect(result).toBeNull();
        });
    });
});

import { NextLocaleToLocale } from '@/utils/Locale';
import { ProductToMerchantsCenterId } from '@/utils/MerchantsCenterId';
import type { ShopifyAnalyticsProduct } from '@shopify/hydrogen-react';

describe('Utils', () => {
    describe('MerchantsCenterId', () => {
        it(`should generate a Merchants Center product ID based on the product's Shopify GIDs`, () => {
            const product: ShopifyAnalyticsProduct = {
                productGid: 'gid://shopify/Product/123',
                variantGid: 'gid://shopify/ProductVariant/456'
            } as ShopifyAnalyticsProduct;

            const locale = NextLocaleToLocale('en-US');

            const merchantsCenterId = ProductToMerchantsCenterId({
                locale,
                product
            });

            expect(merchantsCenterId).toBe('shopify_US_123_456');
        });

        it(`should generate a Merchants Center product ID based on the product's Shopify GIDs`, () => {
            const product: ShopifyAnalyticsProduct = {
                productGid: 'gid://shopify/Product/123',
                variantGid: 'gid://shopify/ProductVariant/456'
            } as ShopifyAnalyticsProduct;

            const locale = NextLocaleToLocale('fr-CA');

            const merchantsCenterId = ProductToMerchantsCenterId({
                locale,
                product
            });

            expect(merchantsCenterId).toBe('shopify_CA_123_456');
        });
    });
});

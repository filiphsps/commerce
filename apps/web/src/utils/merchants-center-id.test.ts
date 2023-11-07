import { NextLocaleToLocale } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { describe, expect, it } from 'vitest';

describe('Utils', () => {
    describe('MerchantsCenterId', () => {
        it(`should generate a Merchants Center product ID based on the product's Shopify GIDs`, () => {
            const product = {
                productGid: 'gid://shopify/Product/123',
                variantGid: 'gid://shopify/ProductVariant/456'
            } as any;

            const locale = NextLocaleToLocale('en-US')!;

            const merchantsCenterId = ProductToMerchantsCenterId({
                locale,
                product
            });

            expect(merchantsCenterId).toBe('shopify_US_123_456');
            expect(merchantsCenterId).toMatchSnapshot();
        });

        it(`should generate a Merchants Center product ID based on the product's Shopify GIDs`, () => {
            const product = {
                productGid: 'gid://shopify/Product/123',
                variantGid: 'gid://shopify/ProductVariant/456'
            } as any;

            const locale = NextLocaleToLocale('fr-CA')!;

            const merchantsCenterId = ProductToMerchantsCenterId({
                locale,
                product
            });

            expect(merchantsCenterId).toBe('shopify_CA_123_456');
            expect(merchantsCenterId).toMatchSnapshot();
        });
    });
});

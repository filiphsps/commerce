import { describe, expect, it } from 'vitest';

import { Locale } from '@/utils/locale';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';

describe('utils', () => {
    describe('MerchantsCenterId', () => {
        it(`should generate a Merchants Center product ID based on the product's Shopify GIDs`, () => {
            const product = {
                productGid: 'gid://shopify/Product/123',
                variantGid: 'gid://shopify/ProductVariant/456'
            } as any;

            const locale = Locale.from('en-US')!;

            const merchantsCenterId = productToMerchantsCenterId({
                locale,
                product
            });

            expect(merchantsCenterId).toBe('shopify_US_123_456');
            //expect(merchantsCenterId).toMatchSnapshot();
        });

        it(`should generate a Merchants Center product ID based on the product's Shopify GIDs`, () => {
            const product = {
                productGid: 'gid://shopify/Product/123',
                variantGid: 'gid://shopify/ProductVariant/456'
            } as any;

            const locale = Locale.from('fr-CA')!;

            const merchantsCenterId = productToMerchantsCenterId({
                locale,
                product
            });

            expect(merchantsCenterId).toBe('shopify_CA_123_456');
            //expect(merchantsCenterId).toMatchSnapshot();
        });
    });
});

import { ShopifyPriceToNumber } from '@/utils/pricing';

describe('utils', () => {
    describe('ShopifyPriceToNumber', () => {
        it('should return the parsed price if it is a valid number', () => {
            expect(ShopifyPriceToNumber(0, '10.99', '20.99')).toEqual(10.99);
            expect(ShopifyPriceToNumber(0, '5.00')).toEqual(5.0);
            expect(ShopifyPriceToNumber(0, '0.99', '1.99', '2.99')).toEqual(0.99);
            expect(ShopifyPriceToNumber(0, '0.01')).toEqual(0.01);

            expect(ShopifyPriceToNumber(0, '0.99', '1.99', '2.99')).toMatchSnapshot();
        });

        it('should return the fallback value if no valid price is found', () => {
            expect(ShopifyPriceToNumber(0, 'invalid', 'string')).toEqual(0);
            expect(ShopifyPriceToNumber(0, null, undefined)).toEqual(0);
            expect(ShopifyPriceToNumber('default', 'invalid', 'string')).toEqual('default');
        });

        it('should handle price being 0', () => {
            expect(ShopifyPriceToNumber(0, '0')).toEqual(0);
            expect(ShopifyPriceToNumber(0, '0.00')).toEqual(0);
            expect(ShopifyPriceToNumber(1, '0', '0.99')).toEqual(0);
        });

        it('should handle edge cases', () => {
            expect(ShopifyPriceToNumber(0)).toEqual(0);
            expect(ShopifyPriceToNumber(0, '')).toEqual(0);
            expect(ShopifyPriceToNumber(0, ' ')).toEqual(0);
        });

        it('should handle negative prices', () => {
            expect(ShopifyPriceToNumber(0, '-10.99', '-20.99')).toEqual(0);
            expect(ShopifyPriceToNumber(0, '-5.00')).toEqual(0);
            expect(ShopifyPriceToNumber(0, '-0.99', '-1.99', '-2.99')).toEqual(0);
        });
    });
});

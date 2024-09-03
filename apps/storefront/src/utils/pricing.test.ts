import { describe, expect, it } from 'vitest';

import { safeParseFloat } from '@/utils/pricing';

describe('utils', () => {
    describe('safeParseFloat', () => {
        it('should return the parsed price if it is a valid number', () => {
            expect(safeParseFloat(0, '10.99', '20.99')).toEqual(10.99);
            expect(safeParseFloat(0, '5.00')).toEqual(5.0);
            expect(safeParseFloat(0, '0.99', '1.99', '2.99')).toEqual(0.99);
            expect(safeParseFloat(0, '0.01')).toEqual(0.01);

            //expect(safeParseFloat(0, '0.99', '1.99', '2.99')).toMatchSnapshot();
        });

        it('should return the fallback value if no valid price is found', () => {
            expect(safeParseFloat(0, 'invalid', 'string')).toEqual(0);
            expect(safeParseFloat(0, null, undefined)).toEqual(0);
            expect(safeParseFloat('default', 'invalid', 'string')).toEqual('default');
        });

        it('should handle price being 0', () => {
            expect(safeParseFloat(0, '0')).toEqual(0);
            expect(safeParseFloat(0, '0.00')).toEqual(0);
            expect(safeParseFloat(1, '0', '0.99')).toEqual(0);
        });

        it('should handle edge cases', () => {
            expect(safeParseFloat(0)).toEqual(0);
            expect(safeParseFloat(0, '')).toEqual(0);
            expect(safeParseFloat(0, ' ')).toEqual(0);
        });

        it('should handle negative prices', () => {
            expect(safeParseFloat(0, '-10.99', '-20.99')).toEqual(0);
            expect(safeParseFloat(0, '-5.00')).toEqual(0);
            expect(safeParseFloat(0, '-0.99', '-1.99', '-2.99')).toEqual(0);
        });
    });
});

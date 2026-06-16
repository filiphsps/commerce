import { describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { BusinessDataApi } from './store';

describe('BusinessDataApi — shop-record business data (UNIFY-SHOP)', () => {
    it("returns the shop record's business-data group", async () => {
        const business = mockBusinessData({ legalName: 'Acme AB', supportEmail: 'hi@acme.test' });
        const result = await BusinessDataApi({
            shop: mockShop({ overrides: { businessData: business } }),
            locale: Locale.from('en-US'),
        });
        expect(result).toEqual(business);
    });

    it('returns null when the shop carries no business data', async () => {
        const result = await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBeNull();
    });
});

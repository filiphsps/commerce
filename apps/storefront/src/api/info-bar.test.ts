import { describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { InfoBarApi } from './info-bar';

describe('InfoBarApi', () => {
    it("delegates to BusinessDataApi (returns the shop record's business data)", async () => {
        const business = mockBusinessData({ supportEmail: 'hi@x.test' });
        const result = await InfoBarApi({
            shop: mockShop({ overrides: { businessData: business } }),
            locale: Locale.from('en-US'),
        });
        expect(result).toEqual(business);
    });

    it('returns null when the shop carries no business data', async () => {
        expect(await InfoBarApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });
});

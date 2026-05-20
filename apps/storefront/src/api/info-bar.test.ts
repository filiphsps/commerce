import { getBusinessData } from '@nordcom/commerce-cms/api';
import { draftMode } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { InfoBarApi } from './info-bar';

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));
vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getBusinessData: vi.fn() };
});

describe('InfoBarApi', () => {
    beforeEach(() => {
        vi.mocked(draftMode).mockResolvedValue({ isEnabled: false } as never);
    });

    it('delegates to BusinessDataApi (returns the same BusinessDatum)', async () => {
        const business = mockBusinessData({ supportEmail: 'hi@x.test' });
        vi.mocked(getBusinessData).mockResolvedValue(business);
        const result = await InfoBarApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBe(business);
    });

    it('returns null when BusinessData is missing', async () => {
        vi.mocked(getBusinessData).mockResolvedValue(null as never);
        expect(await InfoBarApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });
});

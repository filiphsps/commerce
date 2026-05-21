import { getBusinessData } from '@nordcom/commerce-cms/api';
import { describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { BusinessDataApi } from './store';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getBusinessData: vi.fn() };
});

describe('BusinessDataApi', () => {
    it('calls getBusinessData with mapped shop + locale', async () => {
        vi.mocked(getBusinessData).mockResolvedValue(mockBusinessData());
        await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getBusinessData).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
        });
    });

    it('returns null when CMS doc is missing', async () => {
        vi.mocked(getBusinessData).mockResolvedValue(null as never);
        expect(await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });
});

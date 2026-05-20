import { getBusinessData } from '@nordcom/commerce-cms/api';
import { draftMode } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { BusinessDataApi } from './store';

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));
vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getBusinessData: vi.fn() };
});

describe('BusinessDataApi', () => {
    beforeEach(() => {
        vi.mocked(draftMode).mockResolvedValue({ isEnabled: false } as never);
    });

    it('calls getBusinessData with mapped shop + locale + draft=false', async () => {
        vi.mocked(getBusinessData).mockResolvedValue(mockBusinessData());
        await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getBusinessData).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
            draft: false,
        });
    });

    it('returns null when CMS doc is missing', async () => {
        vi.mocked(getBusinessData).mockResolvedValue(null as never);
        expect(await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });
});

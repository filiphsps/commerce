import { getFooter } from '@nordcom/commerce-cms/api';
import { draftMode } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockFooter, mockShop } from '@/utils/test/fixtures';
import { FooterApi } from './footer';

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));
vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getFooter: vi.fn() };
});

describe('FooterApi', () => {
    beforeEach(() => {
        vi.mocked(draftMode).mockResolvedValue({ isEnabled: false } as never);
    });

    it('maps OnlineShop → ShopRef and forwards draft=false', async () => {
        vi.mocked(getFooter).mockResolvedValue(mockFooter());
        await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getFooter).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
            draft: false,
        });
    });

    it('forwards draft=true when draftMode is enabled', async () => {
        vi.mocked(draftMode).mockResolvedValue({ isEnabled: true } as never);
        vi.mocked(getFooter).mockResolvedValue(mockFooter());
        await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getFooter).toHaveBeenCalledWith(expect.objectContaining({ draft: true }));
    });

    it('returns null when CMS doc is missing', async () => {
        vi.mocked(getFooter).mockResolvedValue(null as never);
        expect(await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });
});

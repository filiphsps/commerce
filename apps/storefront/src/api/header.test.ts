import { getHeader } from '@nordcom/commerce-cms/api';
import { describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockHeader, mockShop } from '@/utils/test/fixtures';
import { HeaderApi } from './header';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getHeader: vi.fn() };
});

describe('HeaderApi', () => {
    it('maps OnlineShop → ShopRef and calls getHeader', async () => {
        vi.mocked(getHeader).mockResolvedValue(mockHeader());
        await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getHeader).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
        });
    });

    it('returns null when CMS doc is missing', async () => {
        vi.mocked(getHeader).mockResolvedValue(null as never);
        const result = await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBeNull();
    });

    it('returns the populated Header doc unchanged on hit', async () => {
        const header = mockHeader({ logoLink: '/landing' });
        vi.mocked(getHeader).mockResolvedValue(header);
        const result = await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBe(header);
    });
});

import { getHeader } from '@nordcom/commerce-cms/api';
import { draftMode } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockHeader, mockShop } from '@/utils/test/fixtures';
import { HeaderApi } from './header';

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));
vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getHeader: vi.fn() };
});

const draftDisabled = { isEnabled: false } as never;
const draftEnabled = { isEnabled: true } as never;

describe('HeaderApi', () => {
    beforeEach(() => {
        vi.mocked(draftMode).mockResolvedValue(draftDisabled);
    });

    it('maps OnlineShop → ShopRef and calls getHeader with draft=false by default', async () => {
        vi.mocked(getHeader).mockResolvedValue(mockHeader());
        await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getHeader).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
            draft: false,
        });
    });

    it('forwards draft=true when draftMode is enabled', async () => {
        vi.mocked(draftMode).mockResolvedValue(draftEnabled);
        vi.mocked(getHeader).mockResolvedValue(mockHeader());
        await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getHeader).toHaveBeenCalledWith(expect.objectContaining({ draft: true }));
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

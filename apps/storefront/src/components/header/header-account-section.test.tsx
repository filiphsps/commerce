import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/edge-config', () => ({
    get: vi.fn(),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
        throw new Error('headers() called inside cached component — this is the regression');
    }),
}));

vi.mock('@/auth', () => ({
    getAuthSession: vi.fn().mockResolvedValue(null),
}));

import { get } from '@vercel/edge-config';
import { headers } from 'next/headers';
import { HeaderAccountSection } from '@/components/header/header-account-section';
import { Locale, type LocaleDictionary } from '@/utils/locale';

describe('components/header/header-account-section', () => {
    it('does not call headers() when reading the accounts-functionality flag', async () => {
        vi.mocked(get).mockResolvedValue(false);
        const headersMock = vi.mocked(headers);
        headersMock.mockClear();

        const shop = { id: 'shop-1', domain: 'example.com' } as unknown as OnlineShop;
        // The component returns null when the flag is false; awaiting it should not throw.
        const result = await HeaderAccountSection({
            shop,
            locale: Locale.default as unknown as Locale,
            i18n: {} as unknown as LocaleDictionary,
        });

        expect(headersMock).not.toHaveBeenCalled();
        expect(result).toBeNull();
    });
});

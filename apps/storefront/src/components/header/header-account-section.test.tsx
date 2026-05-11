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

vi.mock('@/utils/flags-cache-safe', () => ({
    readFlag: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/components/actionable/login-button', () => ({
    LoginButton: () => <button type="button">Login</button>,
}));

vi.mock('@/components/informational/avatar', () => ({
    Avatar: ({ name }: { name?: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock('@/components/link', () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

import { get } from '@vercel/edge-config';
import { headers } from 'next/headers';
import { getAuthSession } from '@/auth';
import { HeaderAccountSection } from '@/components/header/header-account-section';
import { render, screen } from '@/utils/test/react';
import { readFlag } from '@/utils/flags-cache-safe';
import { Locale, type LocaleDictionary } from '@/utils/locale';

const mockShop = { id: 'shop-1', domain: 'example.com' } as unknown as OnlineShop;
const mockI18n = {} as unknown as LocaleDictionary;

describe('components/header/header-account-section', () => {
    it('does not call headers() when reading the accounts-functionality flag', async () => {
        vi.mocked(readFlag).mockResolvedValue(false);
        const headersMock = vi.mocked(headers);
        headersMock.mockClear();

        // The component returns null when the flag is false; awaiting it should not throw.
        const result = await HeaderAccountSection({
            shop: mockShop,
            locale: Locale.default as unknown as Locale,
            i18n: mockI18n,
        });

        expect(headersMock).not.toHaveBeenCalled();
        expect(result).toBeNull();
    });

    it('renders LoginButton when flag is enabled but session is null', async () => {
        vi.mocked(readFlag).mockResolvedValue(true);
        vi.mocked(getAuthSession).mockResolvedValue(null);

        const jsx = await HeaderAccountSection({
            shop: mockShop,
            locale: Locale.default as unknown as Locale,
            i18n: mockI18n,
        });

        const { container } = render(jsx as any);
        expect(container.querySelector('button')).toBeTruthy();
    });

    it('renders Avatar when flag is enabled and session has user data', async () => {
        vi.mocked(readFlag).mockResolvedValue(true);
        vi.mocked(getAuthSession).mockResolvedValue({
            user: { name: 'Test User', image: null, email: 'test@example.com' },
        } as any);

        const jsx = await HeaderAccountSection({
            shop: mockShop,
            locale: Locale.default as unknown as Locale,
            i18n: mockI18n,
        });

        render(jsx as any);
        expect(screen.getByTestId('avatar')).toBeTruthy();
        expect(screen.getByTestId('avatar').textContent).toBe('Test User');
    });
});

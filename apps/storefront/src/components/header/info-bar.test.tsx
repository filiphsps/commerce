import { describe, expect, it, vi } from 'vitest';
import { InfoBar } from '@/components/header/info-bar';
import { render, screen } from '@/utils/test/react';
import { mockShop } from '@/utils/test/fixtures';

vi.mock('@/api/navigation', () => ({
    MenuApi: vi.fn(),
    HeaderApi: vi.fn(),
}));

vi.mock('@/components/informational/locale-flag', () => ({
    LocaleFlag: ({ locale }: { locale: any }) => <span data-testid="locale-flag">{locale?.code}</span>,
}));

import { MenuApi } from '@/api/navigation';

describe('components', () => {
    describe('header', () => {
        describe('InfoBar', () => {
            it('renders null when MenuApi returns null', async () => {
                vi.mocked(MenuApi).mockResolvedValue(null as any);
                const result = await InfoBar({
                    shop: mockShop(),
                    locale: { code: 'en-US' } as any,
                    i18n: {} as any,
                });
                expect(result).toBeNull();
            });

            it('renders null when show_info_bar is false', async () => {
                vi.mocked(MenuApi).mockResolvedValue({ show_info_bar: false } as any);
                const result = await InfoBar({
                    shop: mockShop(),
                    locale: { code: 'en-US' } as any,
                    i18n: {} as any,
                });
                expect(result).toBeNull();
            });

            it('renders the locale flag when show_info_bar is true', async () => {
                vi.mocked(MenuApi).mockResolvedValue({
                    show_info_bar: true,
                    email: null,
                    phone: null,
                } as any);

                const jsx = await InfoBar({
                    shop: mockShop(),
                    locale: { code: 'en-US' } as any,
                    i18n: {} as any,
                });

                render(jsx as any);
                expect(screen.getByTestId('locale-flag')).toBeTruthy();
            });

            it('renders a mailto link when email is configured', async () => {
                vi.mocked(MenuApi).mockResolvedValue({
                    show_info_bar: true,
                    email: 'hello@example.com',
                    phone: null,
                } as any);

                const jsx = await InfoBar({
                    shop: mockShop(),
                    locale: { code: 'en-US' } as any,
                    i18n: {} as any,
                });

                const { container } = render(jsx as any);
                const mailLink = container.querySelector('a[href^="mailto:"]');
                expect(mailLink).toBeTruthy();
            });
        });
    });
});

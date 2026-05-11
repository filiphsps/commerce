import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/footer', () => ({
    FooterApi: vi.fn(),
}));

vi.mock('@prismicio/client', () => ({
    asLink: vi.fn((link: any) => link?.url ?? null),
    asText: vi.fn((data: any) => (Array.isArray(data) ? data.map((d: any) => d.text ?? '').join('') : '')),
}));

vi.mock('@/components/informational/accepted-payment-methods', () => ({
    AcceptedPaymentMethods: () => <div data-testid="payment-methods" />,
}));

vi.mock('@/components/informational/current-locale-flag', () => ({
    CurrentLocaleFlag: () => <div data-testid="locale-flag" />,
}));

vi.mock('@/components/link', () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/typography/prismic-text', () => ({
    PrismicText: ({ data }: any) => <span>{JSON.stringify(data)}</span>,
}));

vi.mock('@/utils/prismic', () => ({
    linkResolver: vi.fn(),
    createClient: vi.fn(),
}));

import { FooterApi } from '@/api/footer';
import FooterContent from '@/components/footer/footer-content';
import { mockShop } from '@/utils/test/fixtures';
import { render, screen } from '@/utils/test/react';

const mockLocale = { code: 'en-US' } as any;
const mockI18n = {} as any;

describe('components', () => {
    describe('footer', () => {
        describe('FooterContent', () => {
            it('is an async function (RSC)', () => {
                expect(typeof FooterContent).toBe('function');
            });

            it('returns null when FooterApi returns null', async () => {
                vi.mocked(FooterApi).mockResolvedValue(null as any);
                const result = await FooterContent({ shop: mockShop(), locale: mockLocale, i18n: mockI18n });
                expect(result).toBeNull();
            });

            it('renders payment methods and locale flag when FooterApi returns data', async () => {
                vi.mocked(FooterApi).mockResolvedValue({
                    copyrights: [],
                    policy_links: [],
                } as any);

                const jsx = await FooterContent({ shop: mockShop(), locale: mockLocale, i18n: mockI18n });
                render(jsx as any);

                expect(screen.getByTestId('payment-methods')).toBeTruthy();
                expect(screen.getByTestId('locale-flag')).toBeTruthy();
            });

            it('skeleton renders skeleton placeholders', () => {
                const { container } = render(<FooterContent.skeleton />);
                expect(container.querySelector('[data-skeleton]')).toBeTruthy();
            });
        });
    });
});

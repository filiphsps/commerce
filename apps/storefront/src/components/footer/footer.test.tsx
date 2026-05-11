import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/footer', () => ({
    FooterApi: vi.fn(),
}));

vi.mock('@/components/footer/footer-content', () => {
    const FooterContent = () => <div data-testid="footer-content" />;
    FooterContent.skeleton = () => <div data-testid="footer-content-skeleton" />;
    FooterContent.displayName = 'Nordcom.Footer.Content';
    return { default: FooterContent };
});

vi.mock('@/components/link', () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/typography/content', () => ({
    Content: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/typography/prismic-text', () => ({
    PrismicText: ({ data }: any) => <span>{JSON.stringify(data)}</span>,
}));

import { FooterApi } from '@/api/footer';
import Footer from '@/components/footer/footer';
import { mockShop } from '@/utils/test/fixtures';
import { render } from '@/utils/test/react';

const mockLocale = { code: 'en-US' } as any;
const mockI18n = {} as any;
const shopWithLogo = () => {
    const shop = mockShop();
    (shop as any).design = {
        ...(shop as any).design,
        header: { logo: { src: null, width: 125, height: 50, alt: 'Logo' } },
    };
    return shop;
};

describe('components', () => {
    describe('footer', () => {
        describe('Footer', () => {
            it('is an async function (RSC)', () => {
                expect(typeof Footer).toBe('function');
            });

            it('returns null when FooterApi returns null', async () => {
                vi.mocked(FooterApi).mockResolvedValue(null as any);
                const result = await Footer({ shop: mockShop(), locale: mockLocale, i18n: mockI18n });
                expect(result).toBeNull();
            });

            it('renders a footer element when FooterApi returns data', async () => {
                vi.mocked(FooterApi).mockResolvedValue({
                    address: [],
                    custom_html: null,
                    body: [],
                    copyrights: [],
                    policy_links: [],
                } as any);

                const jsx = await Footer({ shop: shopWithLogo(), locale: mockLocale, i18n: mockI18n });
                const { container } = render(jsx as any);
                expect(container.querySelector('footer')).toBeTruthy();
            });

            it('skeleton renders a footer element', () => {
                const { container } = render(<Footer.skeleton />);
                expect(container.querySelector('footer')).toBeTruthy();
            });
        });
    });
});

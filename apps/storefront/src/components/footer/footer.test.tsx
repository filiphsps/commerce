import { describe, expect, it, vi } from 'vitest';
import { FooterApi } from '@/api/footer';
import { mockFooter, mockShop } from '@/utils/test/fixtures';
import { renderRSC } from '@/utils/test/rsc';
import Footer from './footer';

vi.mock('@/api/footer', () => ({ FooterApi: vi.fn() }));
// FooterContent is an async server component; the jsdom render path doesn't run
// RSCs. Mock the whole component (preserving the `payments` testid the original
// FooterContent would mount via <AcceptedPaymentMethods>).
vi.mock('@/components/footer/footer-content', () => {
    const FooterContent = () => <div data-testid="payments" />;
    FooterContent.skeleton = () => <div data-testid="footer-content-skeleton" />;
    FooterContent.displayName = 'Nordcom.Footer.Content';
    return { default: FooterContent };
});
vi.mock('@/components/link', () => ({
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

describe('<Footer>', () => {
    it('renders only the minimal chrome when FooterApi returns null', async () => {
        vi.mocked(FooterApi).mockResolvedValue(null);
        const ui = await renderRSC(() =>
            Footer({ shop: mockShop(), locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        // Existing FooterContent + logo still render even without CMS data.
        expect(ui.container.querySelector('footer')).toBeTruthy();
        expect(ui.container.querySelector('[data-testid="payments"]')).toBeTruthy();
    });

    it('renders sections, social, legal, copyright from CMS Footer', async () => {
        vi.mocked(FooterApi).mockResolvedValue(
            mockFooter({
                sections: [
                    {
                        id: 's1',
                        title: 'Help',
                        links: [
                            {
                                id: 'l1',
                                link: {
                                    kind: 'page',
                                    label: 'Contact',
                                    page: { slug: 'contact' } as never,
                                    openInNewTab: false,
                                },
                            },
                        ],
                    },
                ],
                social: [{ id: 'so1', platform: 'instagram', url: 'https://instagram.com/x' }],
                legal: [
                    {
                        id: 'lg1',
                        link: {
                            kind: 'page',
                            label: 'Privacy',
                            page: { slug: 'privacy' } as never,
                            openInNewTab: false,
                        },
                    },
                ],
                copyrightLine: '© Mock 2026',
            }),
        );
        const ui = await renderRSC(() =>
            Footer({ shop: mockShop(), locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        expect(ui.getByText('Help')).toBeTruthy();
        expect(ui.container.querySelector('a[href="/en-US/contact/"]')).toBeTruthy();
        expect(ui.container.querySelector('a[href="https://instagram.com/x"]')).toBeTruthy();
        expect(ui.container.querySelector('a[href="/en-US/privacy/"]')).toBeTruthy();
        expect(ui.getByText('© Mock 2026')).toBeTruthy();
    });

    it("falls back to '© {year} {shop.name}' when copyrightLine is null", async () => {
        const year = new Date().getFullYear();
        vi.mocked(FooterApi).mockResolvedValue(mockFooter({ copyrightLine: null }));
        const ui = await renderRSC(() =>
            Footer({
                shop: mockShop({ overrides: { name: 'Mock Shop' } }),
                locale: { code: 'en-US' } as never,
                i18n: {} as never,
            }),
        );
        expect(ui.getByText(`© ${year} Mock Shop`)).toBeTruthy();
    });
});

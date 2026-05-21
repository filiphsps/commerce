import { describe, expect, it, vi } from 'vitest';
import { HeaderApi, Shop } from '@/api/_loaders';
import { mockHeader, mockNavItem, mockShop } from '@/utils/test/fixtures';
import { renderRSC } from '@/utils/test/rsc';
import Header from './header';

vi.mock('@/api/_loaders', () => ({
    HeaderApi: vi.fn(),
    Shop: { findByDomain: vi.fn(), findAll: vi.fn() },
}));

// HeaderAccountSection sits inside <Suspense>, but importing it pulls in `@/auth`
// and `next/headers`. Mock those so the module graph evaluates cleanly under jsdom.
vi.mock('next/headers', () => ({
    headers: vi.fn(() => new Map()),
    cookies: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock('@/auth', () => ({
    getAuthSession: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/utils/flags/evaluate', () => ({
    evaluateShopFlag: vi.fn().mockReturnValue(false),
}));
vi.mock('@/components/link', () => ({
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

vi.mock('@/components/header/header-account-section', () => {
    const HeaderAccountSection = () => <div data-testid="account-section" />;
    HeaderAccountSection.skeleton = () => <div data-testid="account-section-skeleton" />;
    return { HeaderAccountSection };
});

vi.mock('@/components/header/cart-button', () => ({
    CartButton: () => <div data-testid="cart-button" />,
}));

describe('<Header>', () => {
    it('falls back to minimal chrome when HeaderApi returns null', async () => {
        vi.mocked(Shop.findByDomain).mockResolvedValue(mockShop());
        vi.mocked(HeaderApi).mockResolvedValue(null);
        const ui = await renderRSC(() =>
            Header({ domain: 'staging.storefront.localhost', locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        // Cart + Search anchors should still render even without CMS data.
        expect(ui.container.querySelector('a[href="/search/"]')).toBeTruthy();
    });

    it('renders CMS-driven nav links when HeaderApi returns items', async () => {
        vi.mocked(Shop.findByDomain).mockResolvedValue(mockShop());
        vi.mocked(HeaderApi).mockResolvedValue(
            mockHeader({
                items: [
                    mockNavItem({
                        link: { kind: 'page', label: 'Shop', page: { slug: 'shop' } as never, openInNewTab: false },
                    }),
                ],
            }),
        );
        const ui = await renderRSC(() =>
            Header({ domain: 'staging.storefront.localhost', locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        expect(ui.container.querySelector('a[href="/en-US/shop/"]')).toBeTruthy();
    });
});

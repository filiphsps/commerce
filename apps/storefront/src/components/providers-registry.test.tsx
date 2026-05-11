import type { OnlineShop } from '@nordcom/commerce-db';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProvidersRegistry from '@/components/providers-registry';
import { Locale } from '@/utils/locale';

// Heavy providers we don't want to render in this unit test
vi.mock('@shopify/hydrogen-react', () => ({
    CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ShopifyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@prismicio/next', () => ({
    PrismicPreview: () => null,
}));
vi.mock('@/components/prismic-registry', () => ({
    PrismicRegistry: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/shop/provider', () => ({
    ShopProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/live-chat-provider', () => ({
    LiveChatProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/toolbars', () => ({
    Toolbars: () => null,
}));
vi.mock('sonner', () => ({
    Toaster: () => null,
}));
vi.mock('@/utils/prismic', () => ({
    createClient: () => ({}),
}));
vi.mock('@/hooks/useCartUtils', () => ({
    useCartUtils: () => undefined,
}));
vi.mock('@/api/shopify/cart', () => ({
    CartFragment: {},
}));

const makeShop = (overrides: Partial<OnlineShop> = {}): OnlineShop =>
    ({
        id: 'shop-1',
        domain: 'shop.example.com',
        commerceProvider: { type: 'shopify' },
        contentProvider: { type: 'shopify' },
        ...overrides,
    }) as unknown as OnlineShop;

describe('components/providers-registry', () => {
    describe('CommerceProvider (via ProvidersRegistry)', () => {
        it('renders children without ShopifyProvider when commerceProvider.domain is missing (shopify content provider)', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const shop = makeShop();

            expect(() =>
                render(
                    <ProvidersRegistry
                        shop={shop}
                        domain="shop.example.com"
                        locale={Locale.default as unknown as Locale}
                        toolbars={false}
                    >
                        <div data-testid="content">Page content</div>
                    </ProvidersRegistry>,
                ),
            ).not.toThrow();

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('missing commerceProvider.domain'));

            errorSpy.mockRestore();
        });
    });
});

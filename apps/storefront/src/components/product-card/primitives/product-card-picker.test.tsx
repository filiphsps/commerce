import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@/utils/test/react';
import { ProductCardOptionsProvider } from './product-card-options-provider';
import ProductCardPicker from './product-card-picker';

vi.mock('@nordcom/cart-react', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

beforeEach(() => {
    vi.mocked(useCartActions).mockReturnValue({ addLine: vi.fn().mockResolvedValue({ ok: true }) } as any);
    vi.mocked(useCartStatus).mockReturnValue({ cartReady: true, status: 'idle', error: null });
});

afterEach(() => {
    vi.restoreAllMocks();
});

const product = {
    handle: 'tee',
    title: 'Test Tee',
    options: [{ name: 'Size', values: ['M'], optionValues: [{ name: 'M' }] }],
    variants: {
        edges: [
            {
                node: {
                    id: 'v1',
                    selectedOptions: [{ name: 'Size', value: 'M' }],
                    availableForSale: true,
                    price: { amount: '29.00', currencyCode: 'USD' },
                },
            },
        ],
    },
} as never;

describe('ProductCardPicker', () => {
    it('does not throw when window.matchMedia is unavailable (WKWebView in-app browser)', () => {
        // Simulate WKWebView where window exists but matchMedia is undefined.
        // Before fix: window.matchMedia('...') throws TypeError mid-render.
        const original = window.matchMedia;
        // @ts-expect-error intentionally removing matchMedia to simulate WKWebView
        delete window.matchMedia;

        expect(() => {
            render(
                <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
                    <ProductCardPicker
                        locale={{ code: 'en-US' } as never}
                        i18n={{} as never}
                        presentation="auto"
                        ctaPlacement="float-pill"
                        layout="vertical"
                    />
                </ProductCardOptionsProvider>,
            );
        }).not.toThrow();

        window.matchMedia = original;
    });
});

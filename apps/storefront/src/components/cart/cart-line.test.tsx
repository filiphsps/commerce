import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartLine } from '@/components/cart/cart-line';
import { mockShop } from '@/utils/test/fixtures';
import { render, screen } from '@/utils/test/react';

vi.mock('@nordcom/cart-react', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

const updateLine = vi.fn().mockResolvedValue({ ok: true, cart: {} });
const removeLine = vi.fn().mockResolvedValue({ ok: true, cart: {} });

beforeEach(() => {
    updateLine.mockClear();
    removeLine.mockClear();
    vi.mocked(useCartActions).mockReturnValue({
        addLine: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
        updateLine,
        removeLine,
        applyDiscountCode: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
        removeDiscountCode: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
        applyGiftCard: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
        removeGiftCard: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
        updateNote: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
        updateAttributes: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
    } as any);
    vi.mocked(useCartStatus).mockReturnValue({ cartReady: true, status: 'idle', error: null });
});

vi.mock('@/components/shop/provider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/components/shop/provider')>();
    return {
        ...actual,
        useShop: () => ({
            shop: mockShop(),
            currency: 'USD',
            locale: { code: 'en-US', language: 'EN', country: 'US' } as any,
        }),
    };
});

vi.mock('@/utils/build-config', () => ({
    BuildConfig: { environment: 'test' },
    COMMERCE_DEFAULTS: { maxQuantity: 99 },
}));

/** Cart-core normalized shape — what CartProvider actually delivers at runtime. */
const buildCoreCartLine = (
    overrides?: Partial<{
        productTitle: string;
        productVendor: string;
        variantTitle: string;
        selectedOptions: Array<{ name: string; value: string }>;
        quantityAvailable: number | null;
    }>,
) => ({
    id: 'gid://shopify/CartLine/core-1',
    quantity: 2,
    attributes: [],
    custom: {},
    merchandise: {
        id: 'gid://shopify/ProductVariant/MR',
        productId: 'gid://shopify/Product/1',
        productHandle: 'demo',
        productTitle: overrides?.productTitle ?? 'Demo Title',
        productVendor: overrides?.productVendor ?? 'Demo Vendor',
        productType: 'Bakery',
        variantTitle: overrides?.variantTitle ?? 'M / Red',
        image: { url: 'https://cdn.shopify.com/demo.jpg', altText: null, width: 200, height: 200 },
        selectedOptions: overrides?.selectedOptions ?? [
            { name: 'Size', value: 'M' },
            { name: 'Color', value: 'Red' },
        ],
        unitPrice: { amount: '10.00', currencyCode: 'USD' as const },
        compareAtUnitPrice: null,
        availableForSale: true,
        quantityAvailable: overrides?.quantityAvailable !== undefined ? overrides.quantityAvailable : 10,
        sku: null,
    },
    cost: {
        subtotal: { amount: '20.00', currencyCode: 'USD' as const },
        total: { amount: '20.00', currencyCode: 'USD' as const },
    },
    discountAllocations: [],
});

describe('components', () => {
    describe('CartLine', () => {
        it('renders product title and vendor from cart-core normalized line data', () => {
            render(<CartLine i18n={{} as any} data={buildCoreCartLine()} />);
            expect(screen.getByText(/Demo Vendor/)).toBeInTheDocument();
            expect(screen.getByText(/Demo Title/)).toBeInTheDocument();
        });

        it('renders selected option pills with Name·Value format', () => {
            render(<CartLine i18n={{} as any} data={buildCoreCartLine()} />);
            expect(screen.getByText('Size·M')).toBeInTheDocument();
            expect(screen.getByText('Color·Red')).toBeInTheDocument();
        });

        it('does not render productType in the cart-line body', () => {
            const { container } = render(<CartLine i18n={{} as any} data={buildCoreCartLine()} />);
            expect(container.textContent).not.toContain('Bakery');
        });

        it('does not render option pills for variant-less products (Default Title)', () => {
            render(
                <CartLine
                    i18n={{} as any}
                    data={buildCoreCartLine({
                        variantTitle: 'Default Title',
                        selectedOptions: [{ name: 'Title', value: 'Default Title' }],
                    })}
                />,
            );
            expect(screen.queryByText(/·/)).not.toBeInTheDocument();
        });
    });
});

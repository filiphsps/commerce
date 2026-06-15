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

        describe('layout and theming', () => {
            it('frames the image in a fixed square media box that does not stretch to the text height', () => {
                render(<CartLine i18n={{} as any} data={buildCoreCartLine()} />);
                const media = screen.getByTestId('cart-line-image');

                // Consistent media box: a fixed square that never inherits the
                // variable text-column height — the root cause of mismatched
                // line-item image sizes.
                expect(media.className).toContain('aspect-square');
                expect(media.className).toContain('shrink-0');
                expect(media.className).toContain('self-start');
                expect(media.className).not.toMatch(/\bh-full\b/);
                expect(media.className).not.toMatch(/\bmin-h-32\b/);
            });

            it('clamps long product titles instead of letting them overflow', () => {
                render(
                    <CartLine
                        i18n={{} as any}
                        data={buildCoreCartLine({
                            productTitle:
                                'An Extraordinarily Long Product Title That Would Otherwise Overflow Its Column And Break The Cart Layout',
                        })}
                    />,
                );
                const title = screen.getByTestId('cart-line-title');
                expect(title.className).toContain('line-clamp-2');
                expect(title.className).toContain('break-words');
            });

            it('truncates long variant option values inside their pill', () => {
                render(
                    <CartLine
                        i18n={{} as any}
                        data={buildCoreCartLine({
                            selectedOptions: [
                                { name: 'Material', value: 'Recycled-Ocean-Bound-Polyamide-With-A-Very-Long-Name' },
                            ],
                        })}
                    />,
                );
                const pill = screen.getByText(/^Material·/);
                expect(pill.className).toContain('max-w-full');
                expect(pill.className).toContain('overflow-hidden');
                expect(pill.className).toContain('text-ellipsis');
            });

            it('paints the media frame with semantic theme tokens, not hardcoded colors', () => {
                render(<CartLine i18n={{} as any} data={buildCoreCartLine()} />);
                const media = screen.getByTestId('cart-line-image');

                // Tenant theming flows through CSS custom properties; a hardcoded
                // hex here would make the frame ignore the shop's palette.
                expect(media.className).toContain('bg-(--surface-0)');
                expect(media.className).not.toMatch(/#[0-9a-fA-F]{3,8}/);
            });
        });
    });
});

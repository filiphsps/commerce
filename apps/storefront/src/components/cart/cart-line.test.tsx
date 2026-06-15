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
        compareAtUnitPrice: { amount: string; currencyCode: 'USD' } | null;
        image: { url: string; altText: string | null; width: number; height: number } | null;
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
        image:
            overrides?.image !== undefined
                ? overrides.image
                : { url: 'https://cdn.shopify.com/demo.jpg', altText: null, width: 200, height: 200 },
        selectedOptions: overrides?.selectedOptions ?? [
            { name: 'Size', value: 'M' },
            { name: 'Color', value: 'Red' },
        ],
        unitPrice: { amount: '10.00', currencyCode: 'USD' as const },
        compareAtUnitPrice: overrides?.compareAtUnitPrice !== undefined ? overrides.compareAtUnitPrice : null,
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

        describe('media sizing', () => {
            // The headline regression: image boxes rendered at different sizes
            // because the box height tracked the variable text column. happy-dom
            // has no layout engine, so we assert the *contract* that made the
            // sizes diverge instead of measuring pixels: the frame is a fixed
            // square whose classes never vary with content.

            const shortLine = () =>
                buildCoreCartLine({ productTitle: 'Tee', selectedOptions: [], quantityAvailable: null });

            const tallLine = () =>
                buildCoreCartLine({
                    productTitle:
                        'An Extraordinarily Long Product Title That Wraps Across Several Lines And Inflates The Text Column Height',
                    selectedOptions: [
                        { name: 'Size', value: 'Medium' },
                        { name: 'Color', value: 'Burnt Sienna' },
                        { name: 'Material', value: 'Wool' },
                        { name: 'Fit', value: 'Relaxed' },
                    ],
                    compareAtUnitPrice: { amount: '40.00', currencyCode: 'USD' },
                    quantityAvailable: 2,
                });

            it('keeps the media box class signature identical regardless of text volume', () => {
                const short = render(<CartLine i18n={{} as any} data={shortLine()} />);
                const shortClass = screen.getByTestId('cart-line-image').className;
                short.unmount();

                const tall = render(<CartLine i18n={{} as any} data={tallLine()} />);
                const tallClass = screen.getByTestId('cart-line-image').className;
                tall.unmount();

                // Same frame whether the line has one short word or a wrapped
                // title plus four option pills, a sale price, and a stock warning.
                expect(shortClass).toBe(tallClass);
            });

            it('sizes the media box as a fixed square decoupled from the row/text height', () => {
                render(<CartLine i18n={{} as any} data={tallLine()} />);
                const media = screen.getByTestId('cart-line-image');

                expect(media.className).toContain('aspect-square');
                expect(media.className).toContain('shrink-0');
                expect(media.className).toContain('self-start');
                // Content-coupled height classes are what made sizes diverge.
                expect(media.className).not.toMatch(/\bh-full\b/);
                expect(media.className).not.toMatch(/\bmin-h-/);
            });

            it('gives the image square intrinsic dimensions and contains it without distortion', () => {
                render(<CartLine i18n={{} as any} data={buildCoreCartLine()} />);
                const img = screen.getByRole('img');

                // Square intrinsic ratio + object-contain keeps non-square source
                // art letterboxed inside the uniform frame rather than stretched.
                expect(img.getAttribute('width')).toBe('160');
                expect(img.getAttribute('height')).toBe('160');
                expect(img.className).toContain('object-contain');
            });

            it('renders a square placeholder when the variant has no image so the frame stays uniform', () => {
                render(<CartLine i18n={{} as any} data={buildCoreCartLine({ image: null })} />);
                const media = screen.getByTestId('cart-line-image');

                expect(screen.queryByRole('img')).toBeNull();
                expect(media.className).toContain('aspect-square');
                expect(media.querySelector('svg')).not.toBeNull();
            });
        });

        describe('overflow guards', () => {
            it('clamps a long title and lets its flex column shrink below content width', () => {
                render(
                    <CartLine
                        i18n={{} as any}
                        data={buildCoreCartLine({
                            productTitle:
                                'Supercalifragilisticexpialidocious-Unbreakable-Single-Token-Product-Name-That-Would-Push-The-Layout',
                        })}
                    />,
                );
                const title = screen.getByTestId('cart-line-title');
                expect(title.className).toContain('line-clamp-2');
                expect(title.className).toContain('break-words');
                // Without a min-w-0 ancestor the flex item refuses to shrink and
                // the long token overflows the card regardless of line-clamp.
                expect(title.parentElement?.className).toContain('min-w-0');
            });

            it('truncates an over-long variant value inside its pill', () => {
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
        });

        describe('theming', () => {
            it('uses only semantic CSS-variable colors so tenant palettes flow through', () => {
                // Exercise every colored branch: sale strikethrough, low-stock
                // warning, option pills, and the media frame.
                const { container } = render(
                    <CartLine
                        i18n={{} as any}
                        data={buildCoreCartLine({
                            compareAtUnitPrice: { amount: '40.00', currencyCode: 'USD' },
                            quantityAvailable: 2,
                        })}
                    />,
                );

                // A hardcoded hex in any class attribute means that element ignores
                // the shop's theme tokens.
                const hardcoded = Array.from(container.querySelectorAll('[class]'))
                    .map((el) => el.getAttribute('class') ?? '')
                    .filter((cls) => /#[0-9a-fA-F]{3,8}\b/.test(cls));
                expect(hardcoded).toEqual([]);

                expect(screen.getByTestId('cart-line-image').className).toContain('bg-(--surface-0)');
            });
        });
    });
});

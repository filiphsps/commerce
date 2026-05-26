import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartLine } from '@/components/cart/cart-line';
import { useCartActions, useCartStatus } from '@/components/cart/provider';
import { mockShop } from '@/utils/test/fixtures';
import { fireEvent, render, screen, waitFor } from '@/utils/test/react';

vi.mock('@/components/cart/provider', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

const addLine = vi.fn().mockResolvedValue({ ok: true, cart: {} });
const updateLine = vi.fn().mockResolvedValue({ ok: true, cart: {} });
const removeLine = vi.fn().mockResolvedValue({ ok: true, cart: {} });

beforeEach(() => {
    addLine.mockClear();
    updateLine.mockClear();
    removeLine.mockClear();
    vi.mocked(useCartActions).mockReturnValue({
        addLine,
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

// Variant stubs — referenced both in product.variants.nodes and as
// firstSelectableVariant so that getProductOptions can resolve variant IDs.
// The `product.handle` field is required by getProductOptions for adjacentVariants/firstSelectableVariant lookups.
const vMR = {
    id: 'gid://shopify/ProductVariant/MR',
    handle: 'demo',
    title: 'M / Red',
    availableForSale: true,
    selectedOptions: [
        { name: 'Size', value: 'M' },
        { name: 'Color', value: 'Red' },
    ],
    price: { amount: '10.00', currencyCode: 'USD' },
    product: { handle: 'demo' },
};
const vMB = {
    id: 'gid://shopify/ProductVariant/MB',
    handle: 'demo',
    title: 'M / Blue',
    availableForSale: true,
    selectedOptions: [
        { name: 'Size', value: 'M' },
        { name: 'Color', value: 'Blue' },
    ],
    price: { amount: '10.00', currencyCode: 'USD' },
    product: { handle: 'demo' },
};
const vLR = {
    id: 'gid://shopify/ProductVariant/LR',
    handle: 'demo',
    title: 'L / Red',
    availableForSale: true,
    selectedOptions: [
        { name: 'Size', value: 'L' },
        { name: 'Color', value: 'Red' },
    ],
    price: { amount: '10.00', currencyCode: 'USD' },
    product: { handle: 'demo' },
};
const vLB = {
    id: 'gid://shopify/ProductVariant/LB',
    handle: 'demo',
    title: 'L / Blue',
    availableForSale: true,
    selectedOptions: [
        { name: 'Size', value: 'L' },
        { name: 'Color', value: 'Blue' },
    ],
    price: { amount: '10.00', currencyCode: 'USD' },
    product: { handle: 'demo' },
};

const multiOptionProduct = {
    id: 'gid://shopify/Product/1',
    handle: 'demo',
    title: 'Demo Title',
    vendor: 'Demo Vendor',
    productType: 'Bakery',
    encodedVariantExistence: 'v1_0-1:0-1',
    encodedVariantAvailability: 'v1_0-1:0-1',
    options: [
        {
            id: 'opt1',
            name: 'Size',
            optionValues: [
                { name: 'M', firstSelectableVariant: vMR },
                { name: 'L', firstSelectableVariant: vLR },
            ],
        },
        {
            id: 'opt2',
            name: 'Color',
            optionValues: [
                { name: 'Red', firstSelectableVariant: vMR },
                { name: 'Blue', firstSelectableVariant: vMB },
            ],
        },
    ],
    selectedOrFirstAvailableVariant: vMR,
    adjacentVariants: [vMB, vLR, vLB],
    variants: {
        nodes: [vMR, vMB, vLR, vLB],
        edges: [{ node: vMR }, { node: vMB }, { node: vLR }, { node: vLB }],
    },
};

const vSingle = {
    id: 'gid://shopify/ProductVariant/single',
    handle: 'demo',
    title: 'Default Title',
    availableForSale: true,
    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
    price: { amount: '10.00', currencyCode: 'USD' },
    product: { handle: 'demo' },
};

const variantlessProduct = {
    ...multiOptionProduct,
    encodedVariantExistence: 'v1_0',
    encodedVariantAvailability: 'v1_0',
    options: [
        {
            id: 'opt1',
            name: 'Title',
            optionValues: [{ name: 'Default Title', firstSelectableVariant: vSingle }],
        },
    ],
    selectedOrFirstAvailableVariant: vSingle,
    adjacentVariants: [],
    variants: {
        nodes: [vSingle],
        edges: [{ node: vSingle }],
    },
};

const buildLine = (product: typeof multiOptionProduct, variantIndex = 0) => ({
    id: 'gid://shopify/CartLine/1',
    quantity: 1,
    merchandise: { ...product.variants.nodes[variantIndex]!, product },
    cost: { totalAmount: { amount: '10.00', currencyCode: 'USD' } },
    discountAllocations: [],
});

describe('components', () => {
    describe('CartLine', () => {
        it('renders the pill row with Name·Value pairs and skips Default Title', () => {
            render(<CartLine i18n={{} as any} data={buildLine(multiOptionProduct) as any} />);
            expect(screen.getByText('Size·M')).toBeInTheDocument();
            expect(screen.getByText('Color·Red')).toBeInTheDocument();
        });

        it('does not render productType in the cart-line body', () => {
            const { container } = render(<CartLine i18n={{} as any} data={buildLine(multiOptionProduct) as any} />);
            expect(container.textContent).not.toContain('Bakery');
        });

        it('does not render the pill row for variant-less products', () => {
            render(<CartLine i18n={{} as any} data={buildLine(variantlessProduct, 0) as any} />);
            expect(screen.queryByText(/·/)).not.toBeInTheDocument();
        });

        it('opens the popover with the spacious selector when the pill row is clicked', () => {
            render(<CartLine i18n={{} as any} data={buildLine(multiOptionProduct) as any} />);
            fireEvent.click(screen.getByRole('button', { name: /edit options/i }));
            // The selector renders chips for each value across both options.
            expect(screen.getByRole('button', { name: 'Size: L' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Color: Blue' })).toBeInTheDocument();
        });

        it('removes the old line and adds the new variant, then closes the popover on swap', async () => {
            render(<CartLine i18n={{} as any} data={buildLine(multiOptionProduct) as any} />);
            fireEvent.click(screen.getByRole('button', { name: /edit options/i }));
            fireEvent.click(screen.getByRole('button', { name: 'Size: L' }));
            await waitFor(() => {
                expect(removeLine).toHaveBeenCalledWith('gid://shopify/CartLine/1');
            });
            await waitFor(() => {
                expect(addLine).toHaveBeenCalledWith({
                    variantId: 'gid://shopify/ProductVariant/LR',
                    quantity: 1,
                });
            });
            // Popover should be closed — the spacious chip should no longer be in the DOM.
            expect(screen.queryByRole('button', { name: 'Size: L' })).not.toBeInTheDocument();
        });
    });
});

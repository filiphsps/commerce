import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { useProduct } from '@shopify/hydrogen-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMaybeProductOptions } from '@/components/product-options/context';
import { useQuantity } from '@/components/products/quantity-provider';
import { useShop } from '@/components/shop/provider';
import { mockLocale, mockShop } from '@/utils/test/fixtures';
import { act, render } from '@/utils/test/react';
import { ProductActionsContainer } from './product-actions-container';

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return { ...actual, useProduct: vi.fn() };
});
vi.mock('@nordcom/cart-react', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));
vi.mock('@/components/product-options/context', () => ({
    useMaybeProductOptions: vi.fn(),
}));
vi.mock('@/components/products/quantity-provider', () => ({
    useQuantity: vi.fn(),
}));
vi.mock('@/components/shop/provider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/components/shop/provider')>();
    return { ...actual, useShop: vi.fn() };
});
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: vi.fn() }),
    usePathname: () => '/en-US/products/test/',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/utils/build-config', () => ({
    BuildConfig: { environment: 'test' },
    COMMERCE_DEFAULTS: { maxQuantity: 99 },
}));

const selectVariant = vi.fn();

const product = {
    handle: 'tee',
    title: 'Test Tee',
    options: [{ name: 'Color', values: ['Red', 'Blue'], optionValues: [{ name: 'Red' }, { name: 'Blue' }] }],
    variants: {
        edges: [
            {
                node: {
                    id: 'v1',
                    title: 'Red',
                    availableForSale: true,
                    selectedOptions: [{ name: 'Color', value: 'Red' }],
                    price: { amount: '29.00', currencyCode: 'USD' },
                    encodedVariantExistence: 'v1_0',
                    encodedVariantAvailability: 'v1_0',
                },
            },
            {
                node: {
                    id: 'v2',
                    title: 'Blue',
                    availableForSale: true,
                    selectedOptions: [{ name: 'Color', value: 'Blue' }],
                    price: { amount: '29.00', currencyCode: 'USD' },
                    encodedVariantExistence: 'v1_1',
                    encodedVariantAvailability: 'v1_1',
                },
            },
        ],
    },
    encodedVariantExistence: 'v1_0-1',
    encodedVariantAvailability: 'v1_0-1',
    adjacentVariants: [],
    selectedOrFirstAvailableVariant: null,
} as never;

const selectedVariant = {
    id: 'v1',
    title: 'Red',
    availableForSale: true,
    price: { amount: '29.00', currencyCode: 'USD' },
} as never;

beforeEach(() => {
    selectVariant.mockClear();
    vi.mocked(useProduct).mockReturnValue({
        product,
        selectedVariant,
        selectedOptions: { Color: 'Red' },
        setSelectedOptions: vi.fn(),
    } as any);
    vi.mocked(useMaybeProductOptions).mockReturnValue({ selectVariant } as any);
    vi.mocked(useQuantity).mockReturnValue({ quantity: 1, setQuantity: vi.fn() });
    vi.mocked(useShop).mockReturnValue({
        shop: mockShop(),
        locale: mockLocale(),
        currency: 'USD',
    } as any);
    vi.mocked(useCartActions).mockReturnValue({ addLine: vi.fn() } as any);
    vi.mocked(useCartStatus).mockReturnValue({ cartReady: true, status: 'idle', error: null });
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('ProductActionsContainer', () => {
    it('syncs ProductOptionsContext.selectVariant with Hydrogen selectedOptions on render', async () => {
        render(<ProductActionsContainer i18n={{} as any} />);
        await act(async () => {});
        // After the sync effect fires, selectVariant must have been called with the
        // resolved selected options so VariantPriceClient and VariantStockUrgencyClient
        // display the correct variant data.
        expect(selectVariant).toHaveBeenCalledWith({ Color: 'Red' });
    });
});

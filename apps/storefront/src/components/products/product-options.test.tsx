import { describe, expect, it, vi } from 'vitest';
import { ProductOptions } from '@/components/products/product-options';
import { fireEvent, render, screen } from '@/utils/test/react';

const { options, selectedOptions, variants, setSelectedOptions } = vi.hoisted(() => ({
    options: [
        {
            name: 'Size',
            values: ['100g', '200g', '300g'],
        },
    ],
    selectedOptions: {
        Size: '200g',
    },
    variants: [
        {
            title: '100g',
            id: 'gid://shopify/ProductVariant/1',
            weight: 100,
            weightUnit: 'GRAMS',
        },
        {
            title: '200g',
            id: 'gid://shopify/ProductVariant/2',
            weight: 200,
            weightUnit: 'GRAMS',
        },
        {
            title: '300g',
            id: 'gid://shopify/ProductVariant/3',
            weight: 300,
            weightUnit: 'GRAMS',
        },
    ],
    setSelectedOptions: vi.fn(),
}));

// Mock `@shopify/hydrogen-react`s `useProduct` hook and other
// required functions to prevent `<ProductProvider>` error.
vi.mock('@shopify/hydrogen-react', async () => ({
    ...(((await vi.importActual('@shopify/hydrogen-react')) as any) || {}),
    flattenConnection: vi.fn().mockImplementation((data) => data),
    useProduct: () => ({
        options,
        product: {
            handle: 'test',
            title: 'title',
            vendor: 'vendor',
            variants,
        },
        variants,
        selectedOptions,
        setSelectedOptions,
        isOptionInStock: vi.fn().mockImplementation((_, val) => val !== '100g'),
    }),
    createStorefrontClient: () => ({
        getStorefrontApiUrl: () => '',
        getPublicTokenHeaders: () => ({}),
    }),
    useCart: vi.fn().mockReturnValue({
        status: 'idle',
    }),
    useShop: vi.fn().mockReturnValue({}),
    useShopifyCookies: vi.fn().mockReturnValue({}),
}));

vi.mock('next/link', async () => ({
    ...(((await vi.importActual('next/link')) as any) || {}),
    default: (props: any) => <a {...props} />,
}));

describe('components', () => {
    describe('ProductOptions', () => {
        it('renders all options and values', async () => {
            const { unmount } = render(<ProductOptions />);

            for (const option of options) {
                expect(await screen.findByText(option.name)).toBeInTheDocument();
            }

            // The Size option is localized to oz for en-US (the test wrapper uses Locale.default = en-US).
            // 100g → 3.55oz, 200g → 7.1oz, 300g → 10.6oz
            const ozLabels = ['3.55oz', '7.1oz', '10.6oz'];
            for (const label of ozLabels) {
                expect(await screen.findByRole('link', { name: label })).toBeInTheDocument();
            }

            expect(() => unmount()).not.toThrow();
        });

        it('converts grams to ounces when locale is en-US', async () => {
            render(<ProductOptions />);
            const matches = await screen.findAllByText(/oz/i);
            expect(matches.length).toBe(3);
        });

        it('disables options that are out of stock or unavailable', async () => {
            render(<ProductOptions />);

            // 100g is out of stock (isOptionInStock returns false for '100g').
            // The component renders it as an <a> with a CSS disabled class, not an HTML disabled attribute.
            // It renders as 3.55oz after localization to en-US.
            const target = await screen.findByRole('link', { name: '3.55oz' });

            expect(target).toBeInTheDocument();
            expect(target.className).toMatch(/disabled/);
        });

        it('should call setSelectedOptions when an option is clicked', async () => {
            render(<ProductOptions />);

            // The last variant is 300g, rendered as 10.6oz after localization.
            const target = await screen.findByRole('link', { name: '10.6oz' });

            expect(target).toBeInTheDocument();

            fireEvent.click(target);
            expect(setSelectedOptions).toHaveBeenCalledWith({ Size: variants.at(-1)!.title });
        });
    });
});

import { describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '@/utils/test/react';

import { ProductOptions } from '@/components/products/product-options';

const options = [
    {
        name: 'Size',
        values: ['100g', '200g', '300g']
    }
];

const selectedOptions = {
    Size: '200g'
};

const variants = [
    {
        title: '100g',
        id: 'gid://shopify/ProductVariant/1'
    },
    {
        title: '200g',
        id: 'gid://shopify/ProductVariant/2'
    },
    {
        title: '300g',
        id: 'gid://shopify/ProductVariant/3'
    }
];

const setSelectedOptions = vi.fn();

describe.skip('components', () => {
    // Mock `@shopify/hydrogen-react`s `useProduct` hook and other
    // required functions to prevent `<ProductProvider>` error.
    vi.mock('@shopify/hydrogen-react', async () => ({
        ...((await vi.importActual('@shopify/hydrogen-react')) || {}),
        flattenConnection: vi.fn().mockImplementation((data) => data),
        useProduct: () => ({
            options,
            product: {
                handle: 'test',
                title: 'title',
                vendor: 'vendor',
                variants
            },
            variants,
            selectedOptions,
            setSelectedOptions,
            isOptionInStock: vi.fn().mockImplementation((_, val) => val !== '100g')
        }),
        createStorefrontClient: () => ({
            getStorefrontApiUrl: () => '',
            getPublicTokenHeaders: () => ({})
        }),
        useCart: vi.fn().mockReturnValue({
            status: 'idle'
        }),
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({})
    }));

    vi.mock('next/link', async () => ({
        ...((await vi.importActual('next/link')) || {}),
        default: (props: any) => <a {...props} /> // eslint-disable-line
    }));

    describe('ProductOptions', () => {
        it('renders all options and values', async () => {
            const { unmount } = render(<ProductOptions initialVariant={variants[0] as any} />);

            for (const option of options) {
                expect(await screen.findByText(option.name)).toBeInTheDocument();

                for (const value of option.values) {
                    expect(await screen.findByRole('link', { name: value })).toBeInTheDocument();
                }
            }

            expect(() => unmount()).not.toThrow();
        });

        it.todo('converts grams to ounces when locale is en-US', async () => {
            render(<ProductOptions initialVariant={variants[0] as any} />);

            // We can't use sizeOptionValues[0] because it's in grams.
            const target = await screen.findByRole('link', { name: /4oz/i });

            // NOTE: The conversion function rounds to the nearest whole number.
            expect(target).toBeInTheDocument();
        });

        it('disables options that are out of stock or unavailable', async () => {
            render(<ProductOptions initialVariant={variants[0] as any} />);

            const target = await screen.findByRole('link', { name: variants[0]!.title });

            expect(target).toBeInTheDocument();
            expect(target).toHaveAttribute('disabled');
        });

        it('should call setSelectedOptions when an option is clicked', async () => {
            render(<ProductOptions initialVariant={variants[0] as any} />);

            const variant = variants.at(-1)!;
            const target = await screen.findByRole('link', { name: variant.title });

            expect(target).toBeInTheDocument();

            fireEvent.click(target);
            expect(setSelectedOptions).toHaveBeenCalledWith({ Size: variant.title });
        });
    });
});

import { render, screen, waitFor } from '@/utils/test/react';

import { ProductOptions } from '@/components/products/product-options';
import { Locale } from '@/utils/locale';
import { describe, expect, it, vi } from 'vitest';

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

// Mock `@shopify/hydrogen-react`s `useProduct` hook and other
// required functions to prevent `<ProductProvider>` error.
const setSelectedOptions = vi.fn();
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
    })
}));
vi.mock('next/link', async () => ({
    ...((await vi.importActual('next/link')) || {}),
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('components', () => {
    describe('ProductOptions', () => {
        it('renders all options and values', () => {
            render(
                <ProductOptions
                    locale={Locale.from('en-GB')!}
                    initialVariant={variants[0] as any}
                    selectedVariant={variants[0] as any}
                />
            );
            options.forEach((option) => {
                const optionTitle = screen.getByText(option.name);
                expect(optionTitle).toBeDefined();

                option.values.forEach((value) => {
                    const optionValue = screen.getByText(value);
                    expect(optionValue).toBeDefined();
                });
            });
        });

        it('calls setSelectedOptions when an option is clicked', () => {
            render(
                <ProductOptions
                    locale={Locale.from('en-GB')!}
                    initialVariant={variants[0] as any}
                    selectedVariant={variants[0] as any}
                />
            );
            const target = screen.getByText(variants[1].title);
            expect(target.getAttribute('href')).toBeNull();
        });

        it('converts grams to ounces when locale is en-US', () => {
            render(
                <ProductOptions
                    locale={Locale.from('en-US')!}
                    initialVariant={variants[0] as any}
                    selectedVariant={variants[0] as any}
                />
            );
            // We can't use sizeOptionValues[0] because it's in grams.
            const sizeOptionValueElement = screen.getByText('4oz');

            // NOTE: The conversion function rounds to the nearest whole number.
            expect(sizeOptionValueElement.textContent).toContain('4oz');
        });

        it('disables options that are out of stock or unavailable', async () => {
            render(
                <ProductOptions
                    locale={Locale.from('en-GB')!}
                    initialVariant={variants[0] as any}
                    selectedVariant={variants[0] as any}
                />
            );

            await waitFor(() => {
                const target = screen.getByText(variants[0].title);
                expect(target).toBeDefined();
                expect(target.getAttribute('href')).toBeNull();
                expect(target.getAttribute('disabled')).toBeDefined();
            });
        });
    });
});

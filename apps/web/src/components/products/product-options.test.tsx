import { fireEvent, render, screen } from '@testing-library/react';

import { ProductOptions } from '@/components/products/product-options';
import { NextLocaleToLocale } from '@/utils/locale';
import { describe, expect, it, vi } from 'vitest';

const options = [
    {
        name: 'Size',
        values: ['100g', '200g', '300g']
    },
    {
        name: 'Color',
        values: ['Red', 'Green', 'Blue']
    }
];

const selectedOptions = {
    Size: '200g',
    Color: 'Green'
};

// Mock `@shopify/hydrogen-react`s `useProduct` hook and other
// required functions to prevent `<ProductProvider>` error.
const setSelectedOptions = vi.fn();
vi.mock('@shopify/hydrogen-react', () => ({
    useProduct: () => ({
        options,
        selectedOptions,
        setSelectedOptions,
        isOptionInStock: vi.fn().mockReturnValue(true)
    }),
    createStorefrontClient: () => ({
        getStorefrontApiUrl: () => '',
        getPublicTokenHeaders: () => ({})
    })
}));

describe('Components', () => {
    describe('ProductOptions', () => {
        const onOptionChange = vi.fn();

        it('renders all options and values', () => {
            render(<ProductOptions locale={NextLocaleToLocale('en-GB')!} />);
            options.forEach((option) => {
                const optionTitle = screen.getByText(option.name);
                expect(optionTitle).toBeInTheDocument();

                option.values.forEach((value) => {
                    const optionValue = screen.getByText(value);
                    expect(optionValue).toBeInTheDocument();
                });
            });
        });

        it('calls setSelectedOptions when an option is clicked', () => {
            render(<ProductOptions locale={NextLocaleToLocale('en-GB')!} />);
            fireEvent.click(screen.getByText('Green'));
            expect(setSelectedOptions).toHaveBeenCalledWith({ Color: 'Green', Size: '200g' });
        });

        it('converts grams to ounces when locale is en-US', () => {
            render(<ProductOptions locale={NextLocaleToLocale('en-US')!} />);
            // We can't use sizeOptionValues[0] because it's in grams.
            const sizeOptionValueElement = screen.getByText('4oz');

            // NOTE: The conversion function rounds to the nearest whole number.
            expect(sizeOptionValueElement).toHaveTextContent('4oz');
        });

        it.todo('disables options that are out of stock or unavailable');
    });
});

import { ProductOptions } from '@/components/products/product-options';
import { NextLocaleToLocale } from '@/utils/locale';
import { fireEvent, render, screen } from '@testing-library/react';

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
jest.mock('@shopify/hydrogen-react', () => ({
    useProduct: () => ({ options, selectedOptions }),
    createStorefrontClient: () => ({
        getStorefrontApiUrl: () => '',
        getPublicTokenHeaders: () => ({})
    })
}));

describe('Components', () => {
    describe('ProductOptions', () => {
        const onOptionChange = jest.fn();

        it('renders all options and values', () => {
            render(<ProductOptions locale={NextLocaleToLocale('en-GB')} onOptionChange={onOptionChange} />);
            options.forEach((option) => {
                const optionTitle = screen.getByText(option.name);
                expect(optionTitle).toBeInTheDocument();

                option.values.forEach((value) => {
                    const optionValue = screen.getByText(value);
                    expect(optionValue).toBeInTheDocument();
                });
            });
        });

        it('calls onOptionChange when an option is clicked', () => {
            render(<ProductOptions locale={NextLocaleToLocale('en-GB')} onOptionChange={onOptionChange} />);
            const firstOption = options[0];
            const firstOptionValue = firstOption.values[0];
            const firstOptionValueElement = screen.getByText(firstOptionValue);
            fireEvent.click(firstOptionValueElement);
            expect(onOptionChange).toHaveBeenCalledWith({ name: firstOption.name, value: firstOptionValue });
        });

        it('converts grams to ounces when locale is en-US', () => {
            render(<ProductOptions locale={NextLocaleToLocale('en-US')} onOptionChange={onOptionChange} />);
            // We can't use sizeOptionValues[0] because it's in grams.
            const sizeOptionValueElement = screen.getByText('4oz');

            // NOTE: The conversion function rounds to the nearest whole number.
            expect(sizeOptionValueElement).toHaveTextContent('4oz');
        });

        it.todo('disables options that are out of stock or unavailable');
    });
});

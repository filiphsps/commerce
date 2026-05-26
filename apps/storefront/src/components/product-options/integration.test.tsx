import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@/utils/test/react';
import * as ProductOptions from './index';

const fakeProduct = () =>
    ({
        handle: 'p',
        options: [
            {
                name: 'Color',
                values: ['Red', 'Green'],
                optionValues: [
                    { name: 'Red', swatch: { color: '#f00' } },
                    { name: 'Green', swatch: { color: '#0f0' } },
                ],
            },
        ],
        variants: {
            edges: [
                { node: { id: 'v1', availableForSale: true, selectedOptions: [{ name: 'Color', value: 'Red' }] } },
                { node: { id: 'v2', availableForSale: true, selectedOptions: [{ name: 'Color', value: 'Green' }] } },
            ],
        },
    }) as any;

describe('product-options integration', () => {
    it('clicking a swatch updates the selection and the active state moves', () => {
        render(
            <ProductOptions.Root product={fakeProduct()} initialSelection={{ Color: 'Red' }}>
                <ProductOptions.Group name="Color" />
            </ProductOptions.Root>,
        );
        const red = screen.getByRole('button', { name: 'Red' });
        const green = screen.getByRole('button', { name: 'Green' });
        expect(red.getAttribute('data-active')).toBe('true');
        expect(green.getAttribute('data-active')).toBe('false');
        fireEvent.click(green);
        expect(red.getAttribute('data-active')).toBe('false');
        expect(green.getAttribute('data-active')).toBe('true');
    });
});

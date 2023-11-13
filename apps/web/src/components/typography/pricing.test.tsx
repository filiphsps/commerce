import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Pricing from './pricing';

describe('Pricing', () => {
    const price: MoneyV2 = {
        amount: '10.00',
        currencyCode: 'USD'
    };
    const compareAtPrice: MoneyV2 = {
        amount: '15.00',
        currencyCode: 'USD'
    };

    it('renders the price', () => {
        render(<Pricing price={price} />);
        const priceElement = screen.getByText('$10.00');
        expect(priceElement).toBeInTheDocument();
    });

    it('renders the compare at price', () => {
        render(<Pricing price={price} compareAtPrice={compareAtPrice} />);
        const compareAtPriceElement = screen.getByText('$15.00');
        expect(compareAtPriceElement).toBeInTheDocument();
    });
});

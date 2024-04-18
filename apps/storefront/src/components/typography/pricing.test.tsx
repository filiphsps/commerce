import { describe, expect, it } from 'vitest';

import { render, screen } from '@/utils/test/react';

import Pricing from '@/components/typography/pricing';

import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';

describe('components', () => {
    describe('Pricing', () => {
        const price: MoneyV2 = {
            amount: '10.00',
            currencyCode: 'USD'
        };
        const compareAtPrice: MoneyV2 = {
            amount: '15.00',
            currencyCode: 'USD'
        };

        it('renders without crashing', async () => {
            const { unmount } = render(<Pricing />);

            expect(() => unmount()).not.toThrow();
        });

        it('renders the price', () => {
            render(<Pricing price={price} />);
            const priceElement = screen.getByText('$10.00');
            expect(priceElement).toBeDefined();
        });

        it('renders the compare at price', () => {
            render(<Pricing price={price} compareAtPrice={compareAtPrice} />);
            const compareAtPriceElement = screen.getByText('$15.00');
            expect(compareAtPriceElement).toBeDefined();
        });
    });
});
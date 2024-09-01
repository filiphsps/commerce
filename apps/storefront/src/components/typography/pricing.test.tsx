import { describe, expect, it } from 'vitest';

import { render, screen } from '@/utils/test/react';

import { Pricing } from '@/components/typography/pricing';

import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';

describe('components', () => {
    describe('Pricing', () => {
        const price: MoneyV2 = {
            amount: '10.00',
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
    });
});

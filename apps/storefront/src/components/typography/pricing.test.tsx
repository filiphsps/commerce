import { describe, expect, it, vi } from 'vitest';

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
            expect(() => render(<Pricing />).unmount()).not.toThrow();
        });

        it('renders the price', () => {
            const { container } = render(<Pricing price={price} />);

            expect(container.textContent).toBe('$10.00');
            expect(screen.getByText('$10.00')).toBeDefined();
        });

        it("doesn't render the price when no price is supplied", () => {
            const warnSpy = vi.spyOn(console, 'warn');
            const { container } = render(<Pricing />);

            expect(container.textContent).toBe('');
            expect(warnSpy).toHaveBeenCalled();
        });

        it('renders the price with a custom tag', () => {
            const { container } = render(<Pricing price={price} as="span" />);

            expect(container.querySelector('span')).toBeDefined();
        });
    });
});

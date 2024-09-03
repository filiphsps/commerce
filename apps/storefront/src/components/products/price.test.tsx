import { describe, expect, it } from 'vitest';

import { render, screen } from '@/utils/test/react';

import type { PriceProps } from '@/components/products/price';
import { Price } from '@/components/products/price';

describe('components', () => {
    describe('Price', () => {
        const defaultProps: PriceProps = {
            data: {
                amount: '10.00',
                currencyCode: 'USD'
            }
        };

        it('renders without errors', () => {
            expect(() => render(<Price {...defaultProps} />).unmount()).not.toThrow();
        });

        it('renders the price', () => {
            const { container } = render(<Price {...defaultProps} />);

            expect(container.textContent).toBe('$10.00');
            expect(screen.getByText('$10.00')).toBeDefined();
        });
    });
});

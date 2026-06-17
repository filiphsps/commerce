import { describe, expect, it } from 'vitest';
import type { PriceProps } from '@/components/products/price';
import { CompareAtPrice, Price } from '@/components/products/price';
import { render, screen } from '@/utils/test/react';

describe('components', () => {
    describe('Price', () => {
        const defaultProps: PriceProps = {
            data: {
                amount: '10.00',
                currencyCode: 'USD',
            },
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

    describe('CompareAtPrice', () => {
        it('marks the amount as superseded via <del> with a single strike', () => {
            const { container } = render(<CompareAtPrice data={{ amount: '30.00', currencyCode: 'USD' }} />);
            const del = container.querySelector('del');
            expect(del).not.toBeNull();
            expect(del?.className).toContain('no-underline'); // del's own strike suppressed
            expect(del?.querySelector('.line-through')).not.toBeNull(); // single visual strike on the amount
            expect(del?.textContent).toBe('$30.00');
        });
    });
});

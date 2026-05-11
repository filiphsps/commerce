import { describe, expect, it, vi } from 'vitest';
import { CartButton } from '@/components/header/cart-button';
import { render, screen } from '@/utils/test/react';

let mockTotalQuantity: number | undefined = 0;

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => ({ totalQuantity: mockTotalQuantity }),
    };
});

describe('components', () => {
    describe('header', () => {
        describe('CartButton', () => {
            it('renders a link to the cart page', () => {
                mockTotalQuantity = 0;
                render(<CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />);
                const link = screen.getByRole('link');
                expect(link).toBeTruthy();
                expect(link.getAttribute('href')).toMatch(/cart/);
            });

            it('does not display a quantity count when cart is empty', () => {
                mockTotalQuantity = 0;
                const { container } = render(<CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />);
                // The quantity div renders null when 0
                expect(container.textContent).not.toMatch(/^[1-9]/);
            });

            it('displays the quantity count when cart has items', () => {
                mockTotalQuantity = 3;
                render(<CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />);
                // The quantity number should appear in the DOM
                expect(document.body.textContent).toContain('3');
            });
        });
    });
});

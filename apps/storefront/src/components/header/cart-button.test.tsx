import { useCartCount } from '@nordcom/cart-react';
import { describe, expect, it, vi } from 'vitest';
import { CartButton } from '@/components/header/cart-button';
import { render, screen } from '@/utils/test/react';

vi.mock('@nordcom/cart-react', () => ({
    useCartCount: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

describe('components', () => {
    describe('header', () => {
        describe('CartButton', () => {
            it('renders a link to the cart page', () => {
                vi.mocked(useCartCount).mockReturnValue(0);
                render(<CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />);
                const link = screen.getByRole('link');
                expect(link).toBeTruthy();
                expect(link.getAttribute('href')).toMatch(/cart/);
            });

            it('does not display a quantity count when cart is empty', () => {
                vi.mocked(useCartCount).mockReturnValue(0);
                const { container } = render(<CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />);
                // The quantity div renders null when 0
                expect(container.textContent).not.toMatch(/^[1-9]/);
            });

            it('displays the quantity count when cart has items', () => {
                vi.mocked(useCartCount).mockReturnValue(3);
                render(<CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />);
                // The quantity number should appear in the DOM
                expect(document.body.textContent).toContain('3');
            });

            it('names the link with the action and item count for assistive tech', () => {
                vi.mocked(useCartCount).mockReturnValue(3);
                const i18n = { cart: { 'view-cart': 'View cart', 'n-items': '{0} items' } } as any;
                render(<CartButton locale={{ code: 'en-US' } as any} i18n={i18n} />);
                expect(screen.getByRole('link').getAttribute('aria-label')).toBe('View cart, 3 items');
            });

            it('stamps the count badge when the quantity increases', () => {
                vi.mocked(useCartCount).mockReturnValue(1);
                const { container, rerender } = render(
                    <CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />,
                );

                // First settled render only records the baseline — no stamp.
                expect(container.querySelector('[data-cart-count]')?.className).not.toMatch(/animate-\[chip-stamp/);

                vi.mocked(useCartCount).mockReturnValue(3);
                rerender(<CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />);

                expect(container.querySelector('[data-cart-count]')?.className).toMatch(/animate-\[chip-stamp/);
            });

            it('does not stamp the badge when the quantity decreases', () => {
                vi.mocked(useCartCount).mockReturnValue(3);
                const { container, rerender } = render(
                    <CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />,
                );

                vi.mocked(useCartCount).mockReturnValue(1);
                rerender(<CartButton locale={{ code: 'en-US' } as any} i18n={{} as any} />);

                expect(container.querySelector('[data-cart-count]')?.className).not.toMatch(/animate-\[chip-stamp/);
            });
        });
    });
});

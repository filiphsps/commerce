import { describe, expect, it, vi } from 'vitest';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { fireEvent, render, screen, waitFor } from '@/utils/test/react';

// Approach (b): assert end-state determinism — the initial client render matches the
// passed value prop exactly, which is what makes SSR/client hydration agreement possible.
describe('QuantitySelector hydration', () => {
    it('does not produce hydration warnings with deterministic initial quantity', () => {
        const errs: unknown[][] = [];
        const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => errs.push(args));

        render(<QuantitySelector value={1} update={vi.fn()} i18n={{} as any} />);

        // The input must reflect the passed value immediately on first render —
        // no useLayoutEffect or state divergence that would differ from SSR markup.
        const input = screen.getByTestId('quantity-input');
        expect(input).toHaveValue(1);

        // Filter to any hydration-mismatch warnings that React emits.
        const hydrationErrs = errs.filter((args) => String(args[0]).includes('Hydration'));
        expect(hydrationErrs).toHaveLength(0);

        spy.mockRestore();
    });
});

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => ({ cartReady: true, status: 'idle' }),
    };
});

vi.mock('@/components/shop/provider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/components/shop/provider')>();
    return {
        ...actual,
        useShop: () => ({
            shop: {
                commerce: { maxQuantity: 50 },
                commerceProvider: { type: 'shopify', domain: 'mock.shop' },
            } as any,
            currency: 'USD',
            locale: { code: 'en-US', language: 'EN', country: 'US' } as any,
        }),
    };
});

describe('components', () => {
    describe('QuantitySelector', () => {
        it('renders the quantity selector with initial value', () => {
            render(<QuantitySelector i18n={{} as any} update={() => {}} value={3} />);

            const quantityInput = screen.getByLabelText('quantity');
            expect(quantityInput).toHaveValue(3);
        });

        it('updates the quantity when input value changes', async () => {
            const updateMock = vi.fn();
            render(<QuantitySelector i18n={{} as any} update={updateMock} value={0} />);

            const quantityInput = screen.getByTestId('quantity-input');

            // Use fireEvent to simulate user event
            fireEvent.change(quantityInput, { target: { value: '5' } });
            fireEvent.blur(quantityInput);

            await waitFor(() => {
                expect(updateMock).toHaveBeenCalledWith(5);
            });
        });

        it('clamps input to shop.commerce.maxQuantity when present', async () => {
            const updateMock = vi.fn();
            render(<QuantitySelector i18n={{} as any} update={updateMock} value={0} />);

            const quantityInput = screen.getByTestId('quantity-input');
            fireEvent.change(quantityInput, { target: { value: '999999' } });
            fireEvent.blur(quantityInput);

            await waitFor(() => {
                expect(updateMock).toHaveBeenCalledWith(50);
            });
        });

        it('decreases the quantity when decrease button is clicked', async () => {
            const updateMock = vi.fn();
            render(<QuantitySelector i18n={{} as any} update={updateMock} value={3} />);

            const decreaseButton = screen.getByTestId('quantity-decrease');
            fireEvent.click(decreaseButton);

            await waitFor(() => {
                expect(updateMock).toHaveBeenCalledWith(2);
            });
        });

        it('increases the quantity when increase button is clicked', async () => {
            const updateMock = vi.fn();
            render(<QuantitySelector i18n={{} as any} update={updateMock} value={3} />);

            const increaseButton = screen.getByTestId('quantity-increase');
            fireEvent.click(increaseButton);

            await waitFor(() => {
                expect(updateMock).toHaveBeenCalledWith(4);
            });
        });
    });
});

import { useCartActions, useCartCount, useCartLines, useCartStatus } from '@nordcom/cart-react';
import { describe, expect, it, vi } from 'vitest';
import { CartLines } from '@/components/cart/cart-lines';
import { render, screen } from '@/utils/test/react';

vi.mock('@nordcom/cart-react', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
        ...actual,
        useCartActions: vi.fn(),
        useCartCount: vi.fn(),
        useCartLines: vi.fn(),
        useCartStatus: vi.fn(),
        useMaybeCart: vi.fn().mockReturnValue(null),
    };
});

const removeLine = vi.fn().mockResolvedValue({ ok: true, cart: {} });
const noopAction = vi.fn().mockResolvedValue({ ok: true, cart: {} });

const setState = ({ cartReady, lines, totalQuantity }: { cartReady: boolean; lines: any[]; totalQuantity: number }) => {
    vi.mocked(useCartActions).mockReturnValue({
        addLine: noopAction,
        updateLine: noopAction,
        removeLine,
        applyDiscountCode: noopAction,
        removeDiscountCode: noopAction,
        applyGiftCard: noopAction,
        removeGiftCard: noopAction,
        updateNote: noopAction,
        updateAttributes: noopAction,
    } as any);
    vi.mocked(useCartLines).mockReturnValue({ lines, cartId: lines.length > 0 ? 'cart-id' : null });
    vi.mocked(useCartCount).mockReturnValue(totalQuantity);
    vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', cartReady, error: null });
};

vi.mock('@/components/cart/cart-line', () => ({
    CartLine: Object.assign(
        ({ data }: { data: { id: string; merchandise: { product: { title: string } } } }) => (
            <div data-testid="cart-line">{data.merchandise.product.title}</div>
        ),
        { skeleton: () => <div data-skeleton />, displayName: 'CartLine' },
    ),
}));

vi.mock('@/components/actionable/export-cart-button', () => ({
    ExportCartButton: () => <button>Export</button>,
}));

describe('components', () => {
    describe('CartLines', () => {
        it('renders skeleton when cart is not ready', () => {
            setState({ cartReady: false, lines: [], totalQuantity: 0 });
            const { container } = render(<CartLines i18n={{} as any} />);
            expect(container.querySelector('[data-skeleton]')).toBeTruthy();
        });

        it('renders the empty state with a continue-shopping link when cart has no items', () => {
            setState({ cartReady: true, lines: [], totalQuantity: 0 });
            const i18n = {
                cart: { empty: 'There are no items in your cart.', 'continue-shopping': 'Continue shopping' },
            };
            render(<CartLines i18n={i18n as any} />);
            expect(screen.getByText('There are no items in your cart.')).toBeTruthy();
            expect(screen.getByText('Continue shopping')).toBeTruthy();
        });

        it('renders cart lines when items exist', () => {
            setState({
                cartReady: true,
                lines: [
                    {
                        id: 'line-1',
                        merchandise: {
                            product: { id: 'p1', title: 'Demo Product', vendor: 'Vendor' },
                        },
                    },
                ],
                totalQuantity: 1,
            });
            render(<CartLines i18n={{} as any} />);
            expect(screen.getByText('Demo Product')).toBeTruthy();
        });
    });
});

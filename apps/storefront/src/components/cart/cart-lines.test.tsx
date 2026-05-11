import { describe, expect, it, vi } from 'vitest';
import { CartLines } from '@/components/cart/cart-lines';
import { render, screen } from '@/utils/test/react';

const mockLinesRemove = vi.fn();

let mockCartState: {
    cartReady: boolean;
    lines: any[] | undefined;
    linesRemove: typeof mockLinesRemove;
    totalQuantity: number | undefined;
} = {
    cartReady: true,
    lines: [],
    linesRemove: mockLinesRemove,
    totalQuantity: 0,
};

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => mockCartState,
    };
});

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
            mockCartState = { cartReady: false, lines: undefined, linesRemove: mockLinesRemove, totalQuantity: 0 };
            const { container } = render(<CartLines i18n={{} as any} />);
            expect(container.querySelector('[data-skeleton]')).toBeTruthy();
        });

        it('renders empty state message when cart has no items', () => {
            mockCartState = { cartReady: true, lines: [], linesRemove: mockLinesRemove, totalQuantity: 0 };
            render(<CartLines i18n={{} as any} />);
            expect(screen.getByText('There are no items in your cart.')).toBeTruthy();
        });

        it('renders cart lines when items exist', () => {
            mockCartState = {
                cartReady: true,
                lines: [
                    {
                        id: 'line-1',
                        merchandise: {
                            product: { id: 'p1', title: 'Demo Product', vendor: 'Vendor' },
                        },
                    },
                ],
                linesRemove: mockLinesRemove,
                totalQuantity: 1,
            };
            render(<CartLines i18n={{} as any} />);
            expect(screen.getByText('Demo Product')).toBeTruthy();
        });
    });
});

import { useCartActions, useCartMeta, useCartStatus } from '@nordcom/cart-react';
import { describe, expect, it, vi } from 'vitest';
import { CartNote } from '@/components/cart/cart-note';
import { fireEvent, render, screen } from '@/utils/test/react';

vi.mock('@nordcom/cart-react', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
        ...actual,
        useCartActions: vi.fn(),
        useCartMeta: vi.fn(),
        useCartStatus: vi.fn(),
        useMaybeCart: vi.fn().mockReturnValue(null),
    };
});

const updateNote = vi.fn().mockResolvedValue({ ok: true, cart: {} });
const noopAction = vi.fn().mockResolvedValue({ ok: true, cart: {} });

const setState = ({ cartReady, note }: { cartReady: boolean; note: string | null }) => {
    vi.mocked(useCartActions).mockReturnValue({
        addLine: noopAction,
        updateLine: noopAction,
        removeLine: noopAction,
        applyDiscountCode: noopAction,
        removeDiscountCode: noopAction,
        applyGiftCard: noopAction,
        removeGiftCard: noopAction,
        updateNote,
        updateAttributes: noopAction,
    } as any);
    vi.mocked(useCartMeta).mockReturnValue({
        discountCodes: [],
        giftCards: [],
        buyerIdentity: null,
        note,
        attributes: [],
        checkoutUrl: null,
    });
    vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', cartReady, error: null });
};

describe('components', () => {
    describe('CartNote', () => {
        it('renders a textarea input', () => {
            setState({ cartReady: true, note: null });
            render(<CartNote i18n={{} as any} />);
            expect(screen.getByRole('textbox')).toBeTruthy();
        });

        it('exposes an accessible name (not just a placeholder)', () => {
            setState({ cartReady: true, note: null });
            render(<CartNote i18n={{} as any} />);
            // With an empty dictionary the key itself is the resolved label; the point is the
            // textarea is queryable by an accessible name rather than relying on the placeholder.
            expect(screen.getByRole('textbox', { name: 'placeholder-cart-note' })).toBeTruthy();
        });

        it('renders disabled when cart is not ready', () => {
            setState({ cartReady: false, note: null });
            render(<CartNote i18n={{} as any} />);
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            expect(textarea.disabled).toBe(true);
        });

        it('shows existing note value from cart', () => {
            setState({ cartReady: true, note: 'Leave at door' });
            render(<CartNote i18n={{} as any} />);
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            expect(textarea.value).toBe('Leave at door');
        });

        it('calls updateNote with typed text on blur', () => {
            updateNote.mockClear();
            setState({ cartReady: true, note: '' });
            render(<CartNote i18n={{} as any} />);
            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'New note text' } });
            fireEvent.blur(textarea);
            expect(updateNote).toHaveBeenCalledWith('New note text');
        });
    });
});

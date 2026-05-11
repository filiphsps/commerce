import { describe, expect, it, vi } from 'vitest';
import { CartNote } from '@/components/cart/cart-note';
import { fireEvent, render, screen } from '@/utils/test/react';

const mockNoteUpdate = vi.fn();

let mockCartState: {
    cartReady: boolean;
    note: string | undefined;
    noteUpdate: typeof mockNoteUpdate;
} = {
    cartReady: true,
    note: undefined,
    noteUpdate: mockNoteUpdate,
};

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => mockCartState,
    };
});

describe('components', () => {
    describe('CartNote', () => {
        it('renders a textarea input', () => {
            mockCartState = { cartReady: true, note: undefined, noteUpdate: mockNoteUpdate };
            render(<CartNote i18n={{} as any} />);
            expect(screen.getByRole('textbox')).toBeTruthy();
        });

        it('renders disabled when cart is not ready', () => {
            mockCartState = { cartReady: false, note: undefined, noteUpdate: mockNoteUpdate };
            render(<CartNote i18n={{} as any} />);
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            expect(textarea.disabled).toBe(true);
        });

        it('shows existing note value from cart', () => {
            mockCartState = { cartReady: true, note: 'Leave at door', noteUpdate: mockNoteUpdate };
            render(<CartNote i18n={{} as any} />);
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            expect(textarea.value).toBe('Leave at door');
        });

        it('calls noteUpdate with typed text on blur', () => {
            mockNoteUpdate.mockClear();
            mockCartState = { cartReady: true, note: '', noteUpdate: mockNoteUpdate };
            render(<CartNote i18n={{} as any} />);
            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'New note text' } });
            fireEvent.blur(textarea);
            expect(mockNoteUpdate).toHaveBeenCalledWith('New note text');
        });
    });
});

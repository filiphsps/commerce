import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/cart/kernel', () => ({
    typed: {
        addLine: vi.fn(),
        updateLine: vi.fn(),
        removeLine: vi.fn(),
        applyDiscountCode: vi.fn(),
        removeDiscountCode: vi.fn(),
        applyGiftCard: vi.fn(),
        removeGiftCard: vi.fn(),
        updateNote: vi.fn(),
        updateAttributes: vi.fn(),
        updateBuyerIdentity: vi.fn(),
        dispatch: vi.fn(),
    },
    forms: {
        addLineAction: vi.fn(),
        updateLineAction: vi.fn(),
        removeLineAction: vi.fn(),
        applyDiscountCodeAction: vi.fn(),
        removeDiscountCodeAction: vi.fn(),
        applyGiftCardAction: vi.fn(),
        removeGiftCardAction: vi.fn(),
        updateNoteAction: vi.fn(),
        updateAttributesAction: vi.fn(),
        updateBuyerIdentityAction: vi.fn(),
    },
}));

import { forms, typed } from '@/cart/kernel';
import {
    addLine,
    addLineAction,
    applyDiscountCode,
    applyDiscountCodeAction,
    applyGiftCard,
    applyGiftCardAction,
    dispatch,
    removeDiscountCode,
    removeGiftCard,
    removeLine,
    removeLineAction,
    updateAttributes,
    updateAttributesAction,
    updateBuyerIdentity,
    updateBuyerIdentityAction,
    updateLine,
    updateLineAction,
    updateNote,
    updateNoteAction,
} from './cart';

beforeEach(() => vi.clearAllMocks());

describe('_actions/cart.ts', () => {
    describe('typed re-exports', () => {
        it('addLine forwards args to typed.addLine', async () => {
            vi.mocked(typed.addLine).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'k' });
            expect(typed.addLine).toHaveBeenCalledWith({ variantId: 'v', quantity: 1, idempotencyKey: 'k' });
        });

        it('updateLine forwards args to typed.updateLine', async () => {
            vi.mocked(typed.updateLine).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await updateLine({ lineId: 'l', quantity: 2, idempotencyKey: 'k' });
            expect(typed.updateLine).toHaveBeenCalledWith({ lineId: 'l', quantity: 2, idempotencyKey: 'k' });
        });

        it('removeLine forwards args to typed.removeLine', async () => {
            vi.mocked(typed.removeLine).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await removeLine({ lineId: 'l', idempotencyKey: 'k' });
            expect(typed.removeLine).toHaveBeenCalledWith({ lineId: 'l', idempotencyKey: 'k' });
        });

        it('applyDiscountCode forwards args to typed.applyDiscountCode', async () => {
            vi.mocked(typed.applyDiscountCode).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await applyDiscountCode({ code: 'SUMMER10', idempotencyKey: 'k' });
            expect(typed.applyDiscountCode).toHaveBeenCalledWith({ code: 'SUMMER10', idempotencyKey: 'k' });
        });

        it('removeDiscountCode forwards args to typed.removeDiscountCode', async () => {
            vi.mocked(typed.removeDiscountCode).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await removeDiscountCode({ code: 'SUMMER10', idempotencyKey: 'k' });
            expect(typed.removeDiscountCode).toHaveBeenCalledWith({ code: 'SUMMER10', idempotencyKey: 'k' });
        });

        it('applyGiftCard forwards args to typed.applyGiftCard', async () => {
            vi.mocked(typed.applyGiftCard).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await applyGiftCard({ code: 'GIFT-100', idempotencyKey: 'k' });
            expect(typed.applyGiftCard).toHaveBeenCalledWith({ code: 'GIFT-100', idempotencyKey: 'k' });
        });

        it('removeGiftCard forwards args to typed.removeGiftCard', async () => {
            vi.mocked(typed.removeGiftCard).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await removeGiftCard({ id: 'gc-1', idempotencyKey: 'k' });
            expect(typed.removeGiftCard).toHaveBeenCalledWith({ id: 'gc-1', idempotencyKey: 'k' });
        });

        it('updateNote forwards args to typed.updateNote', async () => {
            vi.mocked(typed.updateNote).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await updateNote({ note: 'Gift wrap please', idempotencyKey: 'k' });
            expect(typed.updateNote).toHaveBeenCalledWith({ note: 'Gift wrap please', idempotencyKey: 'k' });
        });

        it('updateAttributes forwards args to typed.updateAttributes', async () => {
            vi.mocked(typed.updateAttributes).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await updateAttributes({ attributes: [{ key: 'k', value: 'v' }], idempotencyKey: 'k' });
            expect(typed.updateAttributes).toHaveBeenCalledWith({
                attributes: [{ key: 'k', value: 'v' }],
                idempotencyKey: 'k',
            });
        });

        it('updateBuyerIdentity forwards args to typed.updateBuyerIdentity', async () => {
            vi.mocked(typed.updateBuyerIdentity).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await updateBuyerIdentity({ idempotencyKey: 'k' });
            expect(typed.updateBuyerIdentity).toHaveBeenCalledWith({ idempotencyKey: 'k' });
        });

        it('dispatch forwards envelope to typed.dispatch', async () => {
            vi.mocked(typed.dispatch).mockResolvedValueOnce({ ok: true, cart: {} as never });
            const envelope = { mutation: { kind: 'remove-line' as const, lineId: 'l' }, idempotencyKey: 'k' };
            await dispatch(envelope);
            expect(typed.dispatch).toHaveBeenCalledWith(envelope);
        });

        it('propagates failure results from typed actions', async () => {
            vi.mocked(typed.addLine).mockResolvedValueOnce({
                ok: false,
                reason: 'user-error',
                message: 'Sold out',
                userErrors: [{ field: 'lines', message: 'Sold out' }],
            });
            const result = await addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'k' });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.reason).toBe('user-error');
                expect(result.userErrors?.[0]?.message).toBe('Sold out');
            }
        });
    });

    describe('FormData re-exports', () => {
        it('addLineAction forwards FormData to forms.addLineAction', async () => {
            const fd = new FormData();
            fd.set('variantId', 'v');
            vi.mocked(forms.addLineAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await addLineAction(fd);
            expect(forms.addLineAction).toHaveBeenCalledWith(fd);
        });

        it('updateLineAction forwards FormData to forms.updateLineAction', async () => {
            const fd = new FormData();
            fd.set('lineId', 'l');
            vi.mocked(forms.updateLineAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await updateLineAction(fd);
            expect(forms.updateLineAction).toHaveBeenCalledWith(fd);
        });

        it('removeLineAction forwards FormData to forms.removeLineAction', async () => {
            const fd = new FormData();
            fd.set('lineId', 'l');
            vi.mocked(forms.removeLineAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await removeLineAction(fd);
            expect(forms.removeLineAction).toHaveBeenCalledWith(fd);
        });

        it('applyDiscountCodeAction forwards FormData to forms.applyDiscountCodeAction', async () => {
            const fd = new FormData();
            fd.set('code', 'SUMMER10');
            vi.mocked(forms.applyDiscountCodeAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await applyDiscountCodeAction(fd);
            expect(forms.applyDiscountCodeAction).toHaveBeenCalledWith(fd);
        });

        it('applyGiftCardAction forwards FormData to forms.applyGiftCardAction', async () => {
            const fd = new FormData();
            fd.set('code', 'GIFT-100');
            vi.mocked(forms.applyGiftCardAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await applyGiftCardAction(fd);
            expect(forms.applyGiftCardAction).toHaveBeenCalledWith(fd);
        });

        it('updateNoteAction forwards FormData to forms.updateNoteAction', async () => {
            const fd = new FormData();
            fd.set('note', 'note');
            vi.mocked(forms.updateNoteAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await updateNoteAction(fd);
            expect(forms.updateNoteAction).toHaveBeenCalledWith(fd);
        });

        it('updateAttributesAction forwards FormData to forms.updateAttributesAction', async () => {
            const fd = new FormData();
            fd.set('attributes', JSON.stringify([{ key: 'k', value: 'v' }]));
            vi.mocked(forms.updateAttributesAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await updateAttributesAction(fd);
            expect(forms.updateAttributesAction).toHaveBeenCalledWith(fd);
        });

        it('updateBuyerIdentityAction forwards FormData to forms.updateBuyerIdentityAction', async () => {
            const fd = new FormData();
            vi.mocked(forms.updateBuyerIdentityAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
            await updateBuyerIdentityAction(fd);
            expect(forms.updateBuyerIdentityAction).toHaveBeenCalledWith(fd);
        });
    });
});

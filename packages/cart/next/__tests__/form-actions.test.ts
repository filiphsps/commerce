import { describe, expect, it, vi } from 'vitest';

import { createFormCartActions } from '../src/form-actions';
import type { TypedCartActions } from '../src/typed-actions';

function makeTyped(): TypedCartActions {
    return {
        addLine: vi.fn(async () => ({ ok: true, cart: {} as never })),
        updateLine: vi.fn(async () => ({ ok: true, cart: {} as never })),
        removeLine: vi.fn(async () => ({ ok: true, cart: {} as never })),
        applyDiscountCode: vi.fn(async () => ({ ok: true, cart: {} as never })),
        removeDiscountCode: vi.fn(async () => ({ ok: true, cart: {} as never })),
        applyGiftCard: vi.fn(async () => ({ ok: true, cart: {} as never })),
        removeGiftCard: vi.fn(async () => ({ ok: true, cart: {} as never })),
        updateNote: vi.fn(async () => ({ ok: true, cart: {} as never })),
        updateAttributes: vi.fn(async () => ({ ok: true, cart: {} as never })),
        updateBuyerIdentity: vi.fn(async () => ({ ok: true, cart: {} as never })),
        dispatch: vi.fn(async () => ({ ok: true, cart: {} as never })),
    };
}

describe('createFormCartActions', () => {
    it('addLineAction parses FormData into typed args + mints idempotency key', async () => {
        const typed = makeTyped();
        const forms = createFormCartActions({ typed });
        const fd = new FormData();
        fd.set('variantId', 'v1');
        fd.set('quantity', '3');
        await forms.addLineAction(fd);
        expect(typed.addLine).toHaveBeenCalledWith(
            expect.objectContaining({
                variantId: 'v1',
                quantity: 3,
                idempotencyKey: expect.any(String),
            }),
        );
    });

    it('addLineAction returns missing-variant when variantId is absent', async () => {
        const typed = makeTyped();
        const forms = createFormCartActions({ typed });
        const fd = new FormData();
        fd.set('quantity', '1');
        const result = await forms.addLineAction(fd);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('missing-variant');
        expect(typed.addLine).not.toHaveBeenCalled();
    });

    it('addLineAction returns invalid-quantity when quantity is non-numeric or out of range', async () => {
        const typed = makeTyped();
        const forms = createFormCartActions({ typed });
        const fd = new FormData();
        fd.set('variantId', 'v1');
        fd.set('quantity', 'NaN');
        const result = await forms.addLineAction(fd);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('invalid-quantity');
    });

    it('updateLineAction requires both lineId and a valid integer quantity', async () => {
        const typed = makeTyped();
        const forms = createFormCartActions({ typed });

        const fdMissingLine = new FormData();
        fdMissingLine.set('quantity', '1');
        const missingLine = await forms.updateLineAction(fdMissingLine);
        expect(missingLine.ok).toBe(false);
        if (!missingLine.ok) expect(missingLine.reason).toBe('missing-line');

        const fdMissingQty = new FormData();
        fdMissingQty.set('lineId', 'l1');
        const missingQty = await forms.updateLineAction(fdMissingQty);
        expect(missingQty.ok).toBe(false);
        if (!missingQty.ok) expect(missingQty.reason).toBe('invalid-quantity');

        const fdOk = new FormData();
        fdOk.set('lineId', 'l1');
        fdOk.set('quantity', '2');
        await forms.updateLineAction(fdOk);
        expect(typed.updateLine).toHaveBeenCalledWith(expect.objectContaining({ lineId: 'l1', quantity: 2 }));
    });

    it('dispatchAction forwards parsed envelope to typed.dispatch', async () => {
        const typed = makeTyped();
        const forms = createFormCartActions({ typed });
        const envelope = {
            mutation: { kind: 'update-note', note: 'hi' },
            idempotencyKey: 'k-form',
        };
        const fd = new FormData();
        fd.set('envelope', JSON.stringify(envelope));
        await forms.dispatchAction(fd);
        expect(typed.dispatch).toHaveBeenCalledWith(envelope);
    });

    it('dispatchAction returns invalid-code on malformed JSON', async () => {
        const typed = makeTyped();
        const forms = createFormCartActions({ typed });
        const fd = new FormData();
        fd.set('envelope', '{not-json');
        const result = await forms.dispatchAction(fd);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('invalid-code');
    });
});

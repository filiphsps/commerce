import type { Cart } from '@nordcom/cart-core';
import { describe, expect, it } from 'vitest';
import { initialQueueState, queueReducer } from '../src/queue';

function emptyCart(): Cart {
    return {
        id: 'c1',
        providerType: 'mock',
        totalQuantity: 0,
        checkoutUrl: null,
        lines: [],
        cost: {
            subtotal: { amount: '0', currencyCode: 'USD' },
            total: null,
            tax: null,
            shipping: null,
        },
        costStale: false,
        discountCodes: [],
        giftCards: [],
        buyerIdentity: null,
        note: null,
        attributes: [],
        updatedAt: '2026',
        custom: {},
    };
}

describe('queue reducer', () => {
    it('initial state has empty pending and null cart', () => {
        const s = initialQueueState();
        expect(s.confirmed).toBeNull();
        expect(s.pending).toEqual([]);
    });

    it('enqueues a mutation with predicted status + tempLineId for add-line', () => {
        const s0 = { ...initialQueueState(), confirmed: emptyCart() };
        const s1 = queueReducer(s0, {
            type: 'enqueue',
            id: 'idk-1',
            mutation: { kind: 'add-line', variantId: 'v', quantity: 1 },
        });
        expect(s1.pending).toHaveLength(1);
        expect(s1.pending[0]?.status).toBe('predicted');
        expect(s1.pending[0]?.tempLineId).toMatch(/^temp:/);
    });

    it('confirm replaces cart and removes the matching pending entry', () => {
        const s0 = { ...initialQueueState(), confirmed: emptyCart() };
        const s1 = queueReducer(s0, {
            type: 'enqueue',
            id: 'idk-1',
            mutation: { kind: 'add-line', variantId: 'v', quantity: 1 },
        });
        const s2 = queueReducer(s1, {
            type: 'confirm',
            id: 'idk-1',
            cart: { ...emptyCart(), id: 'c-confirmed' },
        });
        expect(s2.confirmed?.id).toBe('c-confirmed');
        expect(s2.pending).toHaveLength(0);
    });

    it('fail marks the mutation failed; subsequent pending that depend on its tempLineId cascade-cancel', () => {
        const s0 = { ...initialQueueState(), confirmed: emptyCart() };
        const s1 = queueReducer(s0, {
            type: 'enqueue',
            id: 'a',
            mutation: { kind: 'add-line', variantId: 'v', quantity: 1 },
        });
        const tempId = s1.pending[0]?.tempLineId;
        if (!tempId) throw new Error('expected tempLineId on add-line');
        const s2 = queueReducer(s1, {
            type: 'enqueue',
            id: 'b',
            mutation: { kind: 'update-line', lineId: tempId, quantity: 5 },
        });
        const s3 = queueReducer(s2, { type: 'fail', id: 'a', message: 'shopify-rejected' });
        expect(s3.pending.find((p) => p.id === 'a')?.status).toBe('failed');
        expect(s3.pending.find((p) => p.id === 'b')?.status).toBe('failed');
        expect(s3.pending.find((p) => p.id === 'b')?.error).toBe('precondition-cart-state');
    });

    it('externalUpdate (cross-tab) replaces confirmed cart; pending referencing missing lines cascade-cancel', () => {
        const startConfirmed: Cart = {
            ...emptyCart(),
            lines: [
                {
                    id: 'real-line',
                    quantity: 1,
                    merchandise: {} as never,
                    cost: {
                        subtotal: { amount: '0', currencyCode: 'USD' },
                        total: { amount: '0', currencyCode: 'USD' },
                    },
                    attributes: [],
                    discountAllocations: [],
                    custom: {},
                },
            ],
        };
        const s0 = { ...initialQueueState(), confirmed: startConfirmed };
        const s1 = queueReducer(s0, {
            type: 'enqueue',
            id: 'u',
            mutation: { kind: 'update-line', lineId: 'real-line', quantity: 2 },
        });
        const newCart = { ...emptyCart(), id: startConfirmed.id, lines: [] };
        const s2 = queueReducer(s1, { type: 'externalUpdate', cart: newCart });
        expect(s2.confirmed?.lines).toHaveLength(0);
        expect(s2.pending.find((p) => p.id === 'u')?.status).toBe('failed');
    });

    it('externalUpdate with mismatched cart id is ignored', () => {
        const s0 = { ...initialQueueState(), confirmed: emptyCart() };
        const s1 = queueReducer(s0, {
            type: 'externalUpdate',
            cart: { ...emptyCart(), id: 'other-cart' },
        });
        expect(s1.confirmed?.id).toBe('c1');
    });
});

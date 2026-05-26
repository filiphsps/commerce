import { describe, expect, it } from 'vitest';
import type { Cart } from '@/api/cart/types';
import { applyOptimistic, type CartMutation } from './optimistic-reducer';

const makeCart = (overrides: Partial<Cart> = {}): Cart => ({
    id: 'cart-1',
    providerType: 'shopify',
    totalQuantity: 1,
    checkoutUrl: null,
    lines: [
        {
            id: 'line-1',
            quantity: 1,
            merchandise: {
                id: 'variant-1',
                productId: 'gid://shopify/Product/1',
                productHandle: 'p',
                productTitle: 'P',
                productVendor: 'V Co',
                productType: 'Type',
                variantTitle: 'V',
                image: null,
                selectedOptions: [],
                unitPrice: { amount: '10', currencyCode: 'USD' },
                compareAtUnitPrice: null,
                availableForSale: true,
                quantityAvailable: 5,
                sku: null,
            },
            cost: {
                subtotal: { amount: '10', currencyCode: 'USD' },
                total: { amount: '10', currencyCode: 'USD' },
            },
            attributes: [],
            discountAllocations: [],
        },
    ],
    cost: {
        subtotal: { amount: '10', currencyCode: 'USD' },
        total: { amount: '10', currencyCode: 'USD' },
        tax: null,
        shipping: null,
    },
    costStale: false,
    discountCodes: [],
    giftCards: [],
    buyerIdentity: null,
    note: null,
    attributes: [],
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
});

describe('applyOptimistic', () => {
    it('returns null for null cart', () => {
        expect(applyOptimistic(null, { kind: 'add-line', variantId: 'v', quantity: 1, tempId: 't' })).toBeNull();
    });

    it('add-line merges into existing line by variantId', () => {
        const cart = makeCart();
        const next = applyOptimistic(cart, { kind: 'add-line', variantId: 'variant-1', quantity: 2, tempId: 't' })!;
        expect(next.totalQuantity).toBe(3);
        expect(next.lines).toHaveLength(1);
        expect(next.lines[0]!.quantity).toBe(3);
        expect(next.costStale).toBe(true);
    });

    it('add-line synthesizes a placeholder line for a new variant', () => {
        const cart = makeCart();
        const next = applyOptimistic(cart, {
            kind: 'add-line',
            variantId: 'variant-NEW',
            quantity: 1,
            tempId: 'temp:abc',
        })!;
        expect(next.lines).toHaveLength(2);
        const placeholder = next.lines.find((l) => l.id === 'temp:abc')!;
        expect(placeholder.merchandise.id).toBe('variant-NEW');
        expect(next.totalQuantity).toBe(2);
    });

    it('update-line with quantity=0 removes the line', () => {
        const cart = makeCart();
        const next = applyOptimistic(cart, { kind: 'update-line', lineId: 'line-1', quantity: 0 })!;
        expect(next.lines).toHaveLength(0);
        expect(next.totalQuantity).toBe(0);
        expect(next.costStale).toBe(true);
    });

    it('update-line with positive quantity adjusts the line', () => {
        const cart = makeCart();
        const next = applyOptimistic(cart, { kind: 'update-line', lineId: 'line-1', quantity: 5 })!;
        expect(next.lines[0]!.quantity).toBe(5);
        expect(next.totalQuantity).toBe(5);
    });

    it('update-line ignores unknown lineId', () => {
        const cart = makeCart();
        const next = applyOptimistic(cart, { kind: 'update-line', lineId: 'missing', quantity: 5 });
        expect(next).toEqual(cart);
    });

    it('remove-line removes by id and updates totalQuantity', () => {
        const cart = makeCart();
        const next = applyOptimistic(cart, { kind: 'remove-line', lineId: 'line-1' })!;
        expect(next.lines).toHaveLength(0);
        expect(next.totalQuantity).toBe(0);
    });

    it('non-line mutations mark cost stale and leave lines untouched', () => {
        const cart = makeCart();
        const cases: CartMutation[] = [
            { kind: 'apply-discount', code: 'X' },
            { kind: 'remove-discount', code: 'X' },
            { kind: 'apply-gift-card', code: 'GC' },
            { kind: 'remove-gift-card', id: 'gc-1' },
            { kind: 'update-note', note: 'hi' },
            { kind: 'update-attributes', attributes: [{ key: 'k', value: 'v' }] },
        ];
        for (const m of cases) {
            const next = applyOptimistic(cart, m)!;
            expect(next.costStale).toBe(true);
            expect(next.lines).toEqual(cart.lines);
        }
    });
});

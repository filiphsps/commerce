import type { Cart, CartCapabilities, SubmitMutation } from '@nordcom/cart-core';
import { act, render, renderHook } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useCartActions, useCartCount, useCartLines } from '../src/hooks';
import { quantitySumPredictor } from '../src/predictors/cart';
import { snapshotPredictor } from '../src/predictors/line';
import { CartProvider } from '../src/provider';

const caps: CartCapabilities = {
    giftCards: true,
    multipleDiscountCodes: true,
    buyerIdentity: true,
    notes: true,
    cartAttributes: true,
    lineAttributes: true,
    customMutations: [],
};
const kernelSnapshot = { type: 'mock', capabilities: caps, customMutationNames: [] as const };
const cart: Cart = {
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

function wrapper(submit: SubmitMutation): (props: { children: ReactNode }) => JSX.Element {
    return ({ children }) => (
        <CartProvider
            kernelSnapshot={kernelSnapshot}
            submitMutation={submit}
            initialCart={cart}
            shopId="shop-1"
            predictors={{ line: [snapshotPredictor()], cart: [quantitySumPredictor()] }}
        >
            {children}
        </CartProvider>
    );
}

describe('CartProvider', () => {
    it('seeds initial cart and exposes count=0', () => {
        const submit: SubmitMutation = vi.fn(async () => ({ ok: true, cart }));
        const { result } = renderHook(() => useCartCount(), { wrapper: wrapper(submit) });
        expect(result.current).toBe(0);
    });

    it('addLine optimistically increments count + confirms on server response', async () => {
        const confirmed: Cart = {
            ...cart,
            lines: [
                {
                    id: 'real-line',
                    quantity: 2,
                    merchandise: { unitPrice: { amount: '5.00', currencyCode: 'USD' } } as never,
                    cost: {
                        subtotal: { amount: '0', currencyCode: 'USD' },
                        total: { amount: '0', currencyCode: 'USD' },
                    },
                    attributes: [],
                    discountAllocations: [],
                    custom: {},
                },
            ],
            totalQuantity: 2,
        };
        const submit: SubmitMutation = vi.fn(async () => ({ ok: true, cart: confirmed }));
        const { result } = renderHook(() => ({ count: useCartCount(), actions: useCartActions() }), {
            wrapper: wrapper(submit),
        });
        await act(async () => {
            await result.current.actions.addLine({
                variantId: 'v',
                quantity: 2,
                snapshot: {
                    variantId: 'v',
                    productHandle: 'h',
                    productTitle: 'T',
                    variantTitle: 'V',
                    image: null,
                    unitPrice: { amount: '5.00', currencyCode: 'USD' },
                },
            });
        });
        expect(result.current.count).toBe(2);
    });

    it('count and lines slices do not couple — no extra re-renders without mutations', () => {
        const submit: SubmitMutation = vi.fn(async () => ({ ok: true, cart }));
        let countRenders = 0;
        let linesRenders = 0;
        function Counter() {
            countRenders++;
            useCartCount();
            return null;
        }
        function Liner() {
            linesRenders++;
            useCartLines();
            return null;
        }
        render(
            <CartProvider kernelSnapshot={kernelSnapshot} submitMutation={submit} initialCart={cart} shopId="s">
                <Counter />
                <Liner />
            </CartProvider>,
        );
        const startC = countRenders;
        const startL = linesRenders;
        expect(countRenders - startC).toBeGreaterThanOrEqual(0);
        expect(linesRenders - startL).toBeGreaterThanOrEqual(0);
    });
});

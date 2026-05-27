import type { Cart, CartCapabilities, SubmitMutation } from '@nordcom/cart-core';
import { act, render, renderHook } from '@testing-library/react';
import { type JSX, type ReactNode, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useCartActions, useCartCount, useCartMeta } from '../src/hooks';
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
        const submit: SubmitMutation = vi.fn(async () => ({ ok: true as const, cart }));
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
        const submit: SubmitMutation = vi.fn(async () => ({ ok: true as const, cart: confirmed }));
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

    it('non-line, non-count mutation does NOT re-render count or actions subscribers', async () => {
        const submit: SubmitMutation = vi.fn(async () => ({
            ok: true as const,
            cart: { ...cart, note: 'Gift wrap please' },
        }));
        const renders: { count: number; meta: number; actions: number } = { count: 0, meta: 0, actions: 0 };
        let capturedActions: ReturnType<typeof useCartActions> | null = null;
        function Probe({ tag, hook }: { tag: 'count' | 'meta' | 'actions'; hook: () => unknown }) {
            const count = useRef(0);
            count.current++;
            hook();
            renders[tag] = count.current;
            return null;
        }
        function CaptureActions() {
            capturedActions = useCartActions();
            return null;
        }
        render(
            <CartProvider kernelSnapshot={kernelSnapshot} submitMutation={submit} initialCart={cart} shopId="s">
                <CaptureActions />
                <Probe tag="count" hook={useCartCount} />
                <Probe tag="meta" hook={useCartMeta} />
                <Probe tag="actions" hook={useCartActions} />
            </CartProvider>,
        );
        await act(async () => {});

        const before = { ...renders };
        await act(async () => {
            await (
                capturedActions as ReturnType<typeof useCartActions> & {
                    updateNote: (n: string) => Promise<unknown>;
                }
            ).updateNote('Gift wrap please');
        });

        expect(renders.meta).toBeGreaterThan(before.meta);
        expect(renders.count).toBe(before.count);
        expect(renders.actions).toBe(before.actions);
    });

    it('useCartActions return value is referentially stable across cart updates', async () => {
        const submit: SubmitMutation = vi.fn(async () => ({
            ok: true as const,
            cart: { ...cart, note: `note-${Math.random()}` },
        }));
        const refs: Array<ReturnType<typeof useCartActions>> = [];
        let capturedActions: ReturnType<typeof useCartActions> | null = null;
        function Watch() {
            const actions = useCartActions();
            refs.push(actions);
            capturedActions = actions;
            return null;
        }
        render(
            <CartProvider kernelSnapshot={kernelSnapshot} submitMutation={submit} initialCart={cart} shopId="s2">
                <Watch />
            </CartProvider>,
        );
        await act(async () => {});
        await act(async () => {
            await (
                capturedActions as ReturnType<typeof useCartActions> & {
                    updateNote: (n: string) => Promise<unknown>;
                }
            ).updateNote('a');
        });
        await act(async () => {
            await (
                capturedActions as ReturnType<typeof useCartActions> & {
                    updateNote: (n: string) => Promise<unknown>;
                }
            ).updateNote('b');
        });

        const unique = new Set(refs);
        expect(unique.size).toBeLessThanOrEqual(2);
    });
});

import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { act, render } from '@/utils/test/react';

vi.mock('@/app/[domain]/[locale]/_actions/cart', () => ({
    addToCartAction: vi.fn(),
    updateCartLineQuantityAction: vi.fn(),
    removeCartLineAction: vi.fn(),
    applyDiscountCodeAction: vi.fn(),
    removeDiscountCodeAction: vi.fn(),
    applyGiftCardAction: vi.fn(),
    removeGiftCardAction: vi.fn(),
    updateBuyerIdentityAction: vi.fn(),
    updateNoteAction: vi.fn(),
    updateAttributesAction: vi.fn(),
}));

import type { Cart } from '@/api/cart/types';
import { addToCartAction } from '@/app/[domain]/[locale]/_actions/cart';
import {
    NordcomCartProvider,
    useCart,
    useCartActions,
    useCartCount,
    useMaybeCart,
    useNordcomCartInternal,
} from './provider';

const fakeCart = (overrides: Partial<Cart> = {}): Cart => ({
    id: 'cart-1',
    providerType: 'shopify',
    totalQuantity: 1,
    checkoutUrl: null,
    lines: [],
    cost: { subtotal: { amount: '10', currencyCode: 'USD' }, total: null, tax: null, shipping: null },
    costStale: false,
    discountCodes: [],
    giftCards: [],
    buyerIdentity: null,
    note: null,
    attributes: [],
    updatedAt: '2026-01-01',
    ...overrides,
});

function Probe({ onValue }: { onValue: (count: number, ready: boolean) => void }) {
    const count = useCartCount();
    const { cart } = useCart();
    onValue(count, !!cart);
    return null;
}

describe('NordcomCartProvider', () => {
    it('starts with null cart, cartReady=false, count=0', () => {
        const values: Array<[number, boolean]> = [];
        render(
            <NordcomCartProvider>
                <Probe onValue={(c, r) => values.push([c, r])} />
            </NordcomCartProvider>,
        );
        expect(values[0]).toEqual([0, false]);
    });

    it('useCart throws outside provider', () => {
        const ErrComp = () => {
            useCart();
            return null;
        };
        expect(() => render(<ErrComp />)).toThrow(/NordcomCartProvider/);
    });

    it('useMaybeCart returns null outside provider', () => {
        let val: unknown = 'untouched';
        const Probe2 = () => {
            val = useMaybeCart();
            return null;
        };
        render(<Probe2 />);
        expect(val).toBeNull();
    });

    it('setInitialCart seeds once and is ignored on subsequent calls', async () => {
        let internal: ReturnType<typeof useNordcomCartInternal> | null = null;
        const Hook = () => {
            internal = useNordcomCartInternal();
            return null;
        };
        const values: Array<[number, boolean]> = [];
        render(
            <NordcomCartProvider>
                <Hook />
                <Probe onValue={(c, r) => values.push([c, r])} />
            </NordcomCartProvider>,
        );
        await act(async () => internal!.setInitialCart(fakeCart({ totalQuantity: 3 })));
        const after = values.at(-1);
        expect(after).toEqual([3, true]);

        await act(async () => internal!.setInitialCart(fakeCart({ totalQuantity: 99 })));
        const final = values.at(-1);
        expect(final![0]).toBe(3);
    });

    it('first paint shows cartReady=false even when a sibling effect calls setInitialCart (regression)', async () => {
        // Hydration safety: consumers must paint at least once with cartReady=false
        // before observing the seeded cart, or SSR/client diverge.
        const readyLog: boolean[] = [];

        const Probe = () => {
            const { cart, cartReady } = useCart();
            readyLog.push(cartReady && cart != null);
            return null;
        };

        const Seeder = () => {
            const { setInitialCart } = useNordcomCartInternal();
            useEffect(() => {
                setInitialCart(fakeCart({ totalQuantity: 2 }));
            }, [setInitialCart]);
            return null;
        };

        await act(async () => {
            render(
                <NordcomCartProvider>
                    <Probe />
                    <Seeder />
                </NordcomCartProvider>,
            );
        });

        expect(readyLog[0]).toBe(false);
        expect(readyLog.at(-1)).toBe(true);
    });

    it('addLine: server success replaces canonical state', async () => {
        let actions: ReturnType<typeof useCartActions> | null = null;
        let internal: ReturnType<typeof useNordcomCartInternal> | null = null;
        const Hooks = () => {
            actions = useCartActions();
            internal = useNordcomCartInternal();
            return null;
        };
        const values: number[] = [];
        render(
            <NordcomCartProvider>
                <Hooks />
                <Probe onValue={(c) => values.push(c)} />
            </NordcomCartProvider>,
        );
        await act(async () => internal!.setInitialCart(fakeCart({ totalQuantity: 1 })));
        (addToCartAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            cart: fakeCart({ totalQuantity: 5 }),
        });
        await act(async () => {
            await actions!.addLine({ variantId: 'v-1', quantity: 4 });
        });
        expect(values.at(-1)).toBe(5);
    });
});

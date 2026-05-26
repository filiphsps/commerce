import { useRef } from 'react';
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
import { updateNoteAction } from '@/app/[domain]/[locale]/_actions/cart';
import { NordcomCartProvider, useCartActions, useCartCount, useCartMeta, useNordcomCartInternal } from './provider';

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

function makeCounter() {
    return function Counter({ tag, hook }: { tag: string; hook: () => unknown }) {
        const renders = useRef(0);
        renders.current++;
        hook();
        (globalThis as unknown as Record<string, number>)[`renders_${tag}`] = renders.current;
        return null;
    };
}

describe('NordcomCartProvider re-render isolation', () => {
    it('non-line, non-count mutation does NOT re-render count or actions subscribers', async () => {
        const Counter = makeCounter();
        let internal: ReturnType<typeof useNordcomCartInternal> | null = null;
        let actions: ReturnType<typeof useCartActions> | null = null;
        const Inner = () => {
            internal = useNordcomCartInternal();
            actions = useCartActions();
            return null;
        };
        render(
            <NordcomCartProvider>
                <Inner />
                <Counter tag="count" hook={useCartCount} />
                <Counter tag="meta" hook={useCartMeta} />
                <Counter tag="actions" hook={useCartActions} />
            </NordcomCartProvider>,
        );
        await act(async () => internal!.setInitialCart(fakeCart()));

        const g = globalThis as unknown as Record<string, number>;
        const beforeCount = g.renders_count;
        const beforeMeta = g.renders_meta;
        const beforeActions = g.renders_actions;

        (updateNoteAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            cart: fakeCart({ note: 'Gift wrap please' }),
        });
        await act(async () => {
            await actions!.updateNote('Gift wrap please');
        });

        const afterCount = g.renders_count;
        const afterMeta = g.renders_meta;
        const afterActions = g.renders_actions;

        expect(afterMeta).toBeGreaterThan(beforeMeta);
        expect(afterCount).toBe(beforeCount);
        expect(afterActions).toBe(beforeActions);
    });

    it('useCartActions return value is referentially stable across cart updates', async () => {
        const refs: Array<unknown> = [];
        let internal: ReturnType<typeof useNordcomCartInternal> | null = null;
        const Watch = () => {
            const actions = useCartActions();
            refs.push(actions);
            internal = useNordcomCartInternal();
            return null;
        };
        render(
            <NordcomCartProvider>
                <Watch />
            </NordcomCartProvider>,
        );
        await act(async () => internal!.setInitialCart(fakeCart()));
        await act(async () => internal!.setInitialCart(fakeCart({ totalQuantity: 99 })));
        await act(async () => internal!.replaceCart(fakeCart({ totalQuantity: 5 })));
        await act(async () => internal!.replaceCart(fakeCart({ totalQuantity: 7 })));
        const unique = new Set(refs);
        expect(unique.size).toBeLessThanOrEqual(2);
    });
});

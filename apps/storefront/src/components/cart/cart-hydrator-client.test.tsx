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

import CartHydratorClient from './cart-hydrator-client';
import { NordcomCartProvider, useCartCount } from './provider';

const fakeCart = (overrides: any = {}) => ({
    id: 'cart-1',
    providerType: 'shopify',
    totalQuantity: 7,
    checkoutUrl: null,
    lines: [],
    cost: { subtotal: { amount: '10', currencyCode: 'USD' }, total: null, tax: null, shipping: null },
    costStale: false,
    discountCodes: [],
    giftCards: [],
    buyerIdentity: null,
    note: null,
    attributes: [],
    updatedAt: '2026',
    ...overrides,
});

describe('CartHydratorClient', () => {
    it('publishes initialCart into the provider on mount', async () => {
        let counterValue = -1;
        const Counter = () => {
            counterValue = useCartCount();
            return null;
        };

        render(
            <NordcomCartProvider>
                <Counter />
                <CartHydratorClient initialCart={fakeCart()} shopId="shop-1" />
            </NordcomCartProvider>,
        );

        await act(async () => {});
        expect(counterValue).toBe(7);
    });

    it('returns null (no DOM)', () => {
        const { container } = render(
            <NordcomCartProvider>
                <CartHydratorClient initialCart={fakeCart()} shopId="shop-1" />
            </NordcomCartProvider>,
        );
        expect(container.textContent).toBe('');
    });
});

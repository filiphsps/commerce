import { describe, expect, it } from 'vitest';
import emptyFixture from './__fixtures__/shopify-cart-empty.json' with { type: 'json' };
import fullFixture from './__fixtures__/shopify-cart-full.json' with { type: 'json' };
import { normalize } from './shopify-normalize';

describe('normalize (shopify → Cart)', () => {
    it('returns null when input is null', () => {
        expect(normalize(null)).toBeNull();
    });

    it('maps id, checkoutUrl, totalQuantity, updatedAt', () => {
        const cart = normalize(fullFixture as any)!;
        expect(cart.id).toBe(fullFixture.id);
        expect(cart.checkoutUrl).toBe(fullFixture.checkoutUrl);
        expect(cart.totalQuantity).toBe(fullFixture.totalQuantity);
        expect(cart.updatedAt).toBe(fullFixture.updatedAt);
    });

    it('always tags providerType as "shopify"', () => {
        expect(normalize(fullFixture as any)!.providerType).toBe('shopify');
    });

    it('initializes costStale to false', () => {
        expect(normalize(fullFixture as any)!.costStale).toBe(false);
    });

    it('maps cost subtotal + total; tax + shipping are always null (Shopify deprecated those fields)', () => {
        const cart = normalize(fullFixture as any)!;
        expect(cart.cost.subtotal.amount).toBe(fullFixture.cost.subtotalAmount.amount);
        expect(cart.cost.total!.amount).toBe(fullFixture.cost.totalAmount.amount);
        expect(cart.cost.tax).toBeNull();
        expect(cart.cost.shipping).toBeNull();
    });

    it('maps note + attributes', () => {
        const cart = normalize(fullFixture as any)!;
        expect(cart.note).toBe(fullFixture.note);
        expect(cart.attributes).toEqual(fullFixture.attributes);
    });

    it('maps buyer identity', () => {
        const cart = normalize(fullFixture as any)!;
        expect(cart.buyerIdentity?.email).toBe(fullFixture.buyerIdentity!.email);
        expect(cart.buyerIdentity?.countryCode).toBe(fullFixture.buyerIdentity!.countryCode);
    });

    it('maps lines including merchandise.image when present', () => {
        const cart = normalize(fullFixture as any)!;
        expect(cart.lines).toHaveLength(2);
        expect(cart.lines[0]!.id).toBe(fullFixture.lines.edges[0]!.node.id);
        expect(cart.lines[0]!.quantity).toBe(fullFixture.lines.edges[0]!.node.quantity);
        expect(cart.lines[0]!.merchandise.image).not.toBeNull();
        expect(cart.lines[0]!.merchandise.selectedOptions).toEqual(
            fullFixture.lines.edges[0]!.node.merchandise.selectedOptions,
        );
    });

    it('treats missing image as null on merchandise', () => {
        const cart = normalize(fullFixture as any)!;
        expect(cart.lines[1]!.merchandise.image).toBeNull();
    });

    it('maps discount codes + applied gift cards', () => {
        const cart = normalize(fullFixture as any)!;
        expect(cart.discountCodes).toHaveLength(1);
        expect(cart.discountCodes[0]!.code).toBe('SUMMER10');
        expect(cart.giftCards).toHaveLength(1);
        expect(cart.giftCards[0]!.lastCharacters).toBe('X42Z');
    });

    it('handles an empty cart', () => {
        const cart = normalize(emptyFixture as any)!;
        expect(cart.lines).toHaveLength(0);
        expect(cart.totalQuantity).toBe(0);
        expect(cart.buyerIdentity).toBeNull();
        expect(cart.note).toBeNull();
        expect(cart.discountCodes).toHaveLength(0);
    });

    it('passes through compare-at unit price when present, null otherwise', () => {
        const cart = normalize(fullFixture as any)!;
        expect(cart.lines[0]!.merchandise.compareAtUnitPrice).not.toBeNull();
        expect(cart.lines[1]!.merchandise.compareAtUnitPrice).toBeNull();
    });
});

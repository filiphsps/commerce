import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/utils/request-context', () => ({
    getRequestContext: vi.fn(),
}));

const { revalidateTag } = await import('next/cache');
const { getRequestContext } = await import('@/utils/request-context');
const { addToCartAction, removeCartLineAction, updateCartLineQuantityAction } = await import('@/pages/_actions/cart');
const { CART_COOKIE } = await import('@/pages/_actions/cart.types');

const ctxOk = { shop: { id: 'shop-1' }, locale: { code: 'en-US' } } as any;

beforeEach(() => {
    vi.resetAllMocks();
    (getRequestContext as any).mockResolvedValue(ctxOk);
});

describe('app/[domain]/[locale]/_actions/cart', () => {
    describe('CART_COOKIE', () => {
        it('exposes a stable cookie name', () => {
            expect(CART_COOKIE).toBe('nordcom-cart-id');
        });
    });

    describe('addToCartAction', () => {
        it('returns ok with cartId when a valid payload is submitted', async () => {
            const fd = new FormData();
            fd.set('variantId', 'gid://shopify/ProductVariant/1');
            fd.set('quantity', '2');
            fd.set('cartId', 'cart-abc');

            const result = await addToCartAction(fd);

            expect(result).toEqual({ ok: true, cartId: 'cart-abc' });
            expect(revalidateTag).toHaveBeenCalledWith('cart:cart-abc', 'max');
            expect(revalidateTag).toHaveBeenCalledWith('shopify.shop-1.cart', 'max');
        });

        it('defaults the quantity to 1 when omitted', async () => {
            const fd = new FormData();
            fd.set('variantId', 'gid://shopify/ProductVariant/1');

            const result = await addToCartAction(fd);

            expect(result.ok).toBe(true);
        });

        it('returns missing-variant when variantId is absent', async () => {
            const result = await addToCartAction(new FormData());
            expect(result).toEqual({ ok: false, reason: 'missing-variant' });
            expect(revalidateTag).not.toHaveBeenCalled();
        });

        it('returns invalid-quantity for a non-integer quantity', async () => {
            const fd = new FormData();
            fd.set('variantId', 'gid://shopify/ProductVariant/1');
            fd.set('quantity', '1.5');

            const result = await addToCartAction(fd);

            expect(result).toEqual({ ok: false, reason: 'invalid-quantity' });
        });

        it('returns invalid-quantity for a negative quantity', async () => {
            const fd = new FormData();
            fd.set('variantId', 'gid://shopify/ProductVariant/1');
            fd.set('quantity', '-1');

            const result = await addToCartAction(fd);

            expect(result).toEqual({ ok: false, reason: 'invalid-quantity' });
        });

        it('returns invalid-quantity for quantity 0 (add must be >= 1)', async () => {
            const fd = new FormData();
            fd.set('variantId', 'gid://shopify/ProductVariant/1');
            fd.set('quantity', '0');

            const result = await addToCartAction(fd);

            expect(result).toEqual({ ok: false, reason: 'invalid-quantity' });
        });

        it('returns missing-shop when the request context cannot resolve a tenant', async () => {
            (getRequestContext as any).mockResolvedValue(null);
            const fd = new FormData();
            fd.set('variantId', 'gid://shopify/ProductVariant/1');

            const result = await addToCartAction(fd);

            expect(result).toEqual({ ok: false, reason: 'missing-shop' });
            expect(revalidateTag).not.toHaveBeenCalled();
        });

        it('does not revalidate when no cartId is supplied yet', async () => {
            const fd = new FormData();
            fd.set('variantId', 'gid://shopify/ProductVariant/1');

            const result = await addToCartAction(fd);

            expect(result.ok).toBe(true);
            expect(result.cartId).toBeUndefined();
            expect(revalidateTag).not.toHaveBeenCalled();
        });
    });

    describe('updateCartLineQuantityAction', () => {
        it('returns ok and revalidates when payload is valid', async () => {
            const fd = new FormData();
            fd.set('lineId', 'line-1');
            fd.set('quantity', '3');
            fd.set('cartId', 'cart-abc');

            const result = await updateCartLineQuantityAction(fd);

            expect(result).toEqual({ ok: true, cartId: 'cart-abc' });
            expect(revalidateTag).toHaveBeenCalledWith('cart:cart-abc', 'max');
        });

        it('accepts a quantity of 0 (delegated remove)', async () => {
            const fd = new FormData();
            fd.set('lineId', 'line-1');
            fd.set('quantity', '0');
            fd.set('cartId', 'cart-abc');

            const result = await updateCartLineQuantityAction(fd);

            expect(result.ok).toBe(true);
        });

        it('returns missing-line when lineId is absent', async () => {
            const fd = new FormData();
            fd.set('quantity', '1');
            fd.set('cartId', 'cart-abc');

            const result = await updateCartLineQuantityAction(fd);

            expect(result).toEqual({ ok: false, reason: 'missing-line' });
        });

        it('returns invalid-quantity when quantity is absent', async () => {
            const fd = new FormData();
            fd.set('lineId', 'line-1');
            fd.set('cartId', 'cart-abc');

            const result = await updateCartLineQuantityAction(fd);

            expect(result).toEqual({ ok: false, reason: 'invalid-quantity' });
        });

        it('returns missing-cart when cartId is absent', async () => {
            const fd = new FormData();
            fd.set('lineId', 'line-1');
            fd.set('quantity', '1');

            const result = await updateCartLineQuantityAction(fd);

            expect(result).toEqual({ ok: false, reason: 'missing-cart' });
        });
    });

    describe('removeCartLineAction', () => {
        it('returns ok and revalidates when payload is valid', async () => {
            const fd = new FormData();
            fd.set('lineId', 'line-1');
            fd.set('cartId', 'cart-abc');

            const result = await removeCartLineAction(fd);

            expect(result).toEqual({ ok: true, cartId: 'cart-abc' });
            expect(revalidateTag).toHaveBeenCalledWith('cart:cart-abc', 'max');
            expect(revalidateTag).toHaveBeenCalledWith('shopify.shop-1.cart', 'max');
        });

        it('returns missing-line when lineId is absent', async () => {
            const result = await removeCartLineAction(new FormData());
            expect(result).toEqual({ ok: false, reason: 'missing-line' });
        });

        it('returns missing-cart when cartId is absent', async () => {
            const fd = new FormData();
            fd.set('lineId', 'line-1');

            const result = await removeCartLineAction(fd);

            expect(result).toEqual({ ok: false, reason: 'missing-cart' });
        });
    });
});

'use server';

import { CartNotFoundError, CartUserError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { revalidateTag } from 'next/cache';

import { resolveCartProvider } from '@/api/cart';
import type { Cart, CartActionFailureReason, CartActionResult } from '@/api/cart/types';
import { getAuthSession } from '@/auth';
import { ensureCart } from '@/utils/cart-server';
import { getDictionary } from '@/utils/dictionary';
import { getTranslations } from '@/utils/locale';
import { getRequestContext } from '@/utils/request-context';

const MAX_QUANTITY = 1_000;

function parseQuantity(raw: FormDataEntryValue | null, fallback: number): number | null {
    if (raw == null || raw === '') return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > MAX_QUANTITY) return null;
    return n;
}

function parseId(raw: FormDataEntryValue | null): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > 512) return null;
    return trimmed;
}

function parseCode(raw: FormDataEntryValue | null): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > 128) return null;
    return trimmed;
}

async function localizedMessage(reason: CartActionFailureReason, userErrorMessage?: string): Promise<string> {
    if (userErrorMessage && userErrorMessage.length > 0) return userErrorMessage;
    const ctx = await getRequestContext();
    if (!ctx) return 'Cart action failed.';
    const i18n = await getDictionary({ shop: ctx.shop, locale: ctx.locale });
    const { t } = getTranslations('cart-errors' as Parameters<typeof getTranslations>[0], i18n);
    return t(reason as Parameters<typeof t>[0]);
}

function isCartUserError(error: unknown): error is CartUserError {
    return error instanceof CartUserError || (error as Error)?.name === 'CartUserError';
}

function isCartNotFoundError(error: unknown): error is CartNotFoundError {
    return error instanceof CartNotFoundError || (error as Error)?.name === 'CartNotFoundError';
}

async function mapAdapterError(error: unknown, cart?: Cart | null): Promise<CartActionResult> {
    if (isCartUserError(error)) {
        const firstMessage = error.userErrors[0]?.message;
        return {
            ok: false,
            reason: 'user-error',
            userErrors: error.userErrors,
            message: await localizedMessage('user-error', firstMessage),
            ...(cart ? { cart } : {}),
        };
    }
    if (isCartNotFoundError(error)) {
        return { ok: false, reason: 'missing-cart', message: await localizedMessage('missing-cart') };
    }
    return { ok: false, reason: 'provider-error', message: await localizedMessage('provider-error') };
}

function revalidateCart(cartId: string): void {
    revalidateTag(`cart:${cartId}`, 'max');
}

export async function addToCartAction(formData: FormData): Promise<CartActionResult> {
    const variantId = parseId(formData.get('variantId'));
    if (!variantId) return { ok: false, reason: 'missing-variant', message: await localizedMessage('missing-variant') };
    const quantity = parseQuantity(formData.get('quantity'), 1);
    if (quantity == null || quantity < 1) {
        return { ok: false, reason: 'invalid-quantity', message: await localizedMessage('invalid-quantity') };
    }
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    try {
        const cart = await ensureCart(ctx.shop, ctx.locale);
        const adapter = resolveCartProvider(ctx.shop);
        const updated = await adapter.addLines({
            cartId: cart.id,
            shop: ctx.shop,
            locale: ctx.locale,
            lines: [{ variantId, quantity }],
        });
        revalidateCart(updated.id);
        trace.getActiveSpan()?.addEvent('cart_action.add', {
            'shop.id': ctx.shop.id,
            'cart.id': updated.id,
            'variant.id': variantId,
            'line.quantity': quantity,
        });
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function updateCartLineQuantityAction(formData: FormData): Promise<CartActionResult> {
    const lineId = parseId(formData.get('lineId'));
    if (!lineId) return { ok: false, reason: 'missing-line', message: await localizedMessage('missing-line') };
    const quantity = parseQuantity(formData.get('quantity'), Number.NaN);
    if (quantity == null || Number.isNaN(quantity)) {
        return { ok: false, reason: 'invalid-quantity', message: await localizedMessage('invalid-quantity') };
    }
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    const cartIdFromForm = parseId(formData.get('cartId'));
    if (!cartIdFromForm) return { ok: false, reason: 'missing-cart', message: await localizedMessage('missing-cart') };
    try {
        const adapter = resolveCartProvider(ctx.shop);
        const updated =
            quantity === 0
                ? await adapter.removeLines({
                      cartId: cartIdFromForm,
                      shop: ctx.shop,
                      locale: ctx.locale,
                      lineIds: [lineId],
                  })
                : await adapter.updateLines({
                      cartId: cartIdFromForm,
                      shop: ctx.shop,
                      locale: ctx.locale,
                      lines: [{ id: lineId, quantity }],
                  });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function removeCartLineAction(formData: FormData): Promise<CartActionResult> {
    const lineId = parseId(formData.get('lineId'));
    if (!lineId) return { ok: false, reason: 'missing-line', message: await localizedMessage('missing-line') };
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    const cartIdFromForm = parseId(formData.get('cartId'));
    if (!cartIdFromForm) return { ok: false, reason: 'missing-cart', message: await localizedMessage('missing-cart') };
    try {
        const adapter = resolveCartProvider(ctx.shop);
        const updated = await adapter.removeLines({
            cartId: cartIdFromForm,
            shop: ctx.shop,
            locale: ctx.locale,
            lineIds: [lineId],
        });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function applyDiscountCodeAction(formData: FormData): Promise<CartActionResult> {
    const code = parseCode(formData.get('code'));
    if (!code) return { ok: false, reason: 'invalid-code', message: await localizedMessage('invalid-code') };
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    try {
        const cart = await ensureCart(ctx.shop, ctx.locale);
        const adapter = resolveCartProvider(ctx.shop);
        const codes = Array.from(new Set([...cart.discountCodes.map((d) => d.code), code]));
        const updated = await adapter.applyDiscountCodes({
            cartId: cart.id,
            shop: ctx.shop,
            locale: ctx.locale,
            codes,
        });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function removeDiscountCodeAction(formData: FormData): Promise<CartActionResult> {
    const code = parseCode(formData.get('code'));
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    try {
        const cart = await ensureCart(ctx.shop, ctx.locale);
        const adapter = resolveCartProvider(ctx.shop);
        const remaining = code ? cart.discountCodes.map((d) => d.code).filter((c) => c !== code) : [];
        const updated = await adapter.applyDiscountCodes({
            cartId: cart.id,
            shop: ctx.shop,
            locale: ctx.locale,
            codes: remaining,
        });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function applyGiftCardAction(formData: FormData): Promise<CartActionResult> {
    const code = parseCode(formData.get('code'));
    if (!code) return { ok: false, reason: 'invalid-code', message: await localizedMessage('invalid-code') };
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    try {
        const cart = await ensureCart(ctx.shop, ctx.locale);
        const adapter = resolveCartProvider(ctx.shop);
        const updated = await adapter.applyGiftCardCodes({
            cartId: cart.id,
            shop: ctx.shop,
            locale: ctx.locale,
            codes: [code],
        });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function removeGiftCardAction(formData: FormData): Promise<CartActionResult> {
    const id = parseId(formData.get('id'));
    if (!id) return { ok: false, reason: 'invalid-code', message: await localizedMessage('invalid-code') };
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    try {
        const cart = await ensureCart(ctx.shop, ctx.locale);
        const adapter = resolveCartProvider(ctx.shop);
        const updated = await adapter.removeGiftCardCodes({
            cartId: cart.id,
            shop: ctx.shop,
            locale: ctx.locale,
            ids: [id],
        });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function updateBuyerIdentityAction(_formData: FormData): Promise<CartActionResult> {
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    const session = await getAuthSession(ctx.shop);
    if (!session?.user?.email) {
        return { ok: false, reason: 'unauthorized', message: await localizedMessage('unauthorized') };
    }
    try {
        const cart = await ensureCart(ctx.shop, ctx.locale);
        const adapter = resolveCartProvider(ctx.shop);
        const updated = await adapter.updateBuyerIdentity({
            cartId: cart.id,
            shop: ctx.shop,
            locale: ctx.locale,
            buyerIdentity: {
                email: session.user.email,
                customerAccessToken: session.user.shopifyAccessToken,
                countryCode: ctx.locale.country ?? undefined,
            },
        });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function updateNoteAction(formData: FormData): Promise<CartActionResult> {
    const noteRaw = formData.get('note');
    const note = typeof noteRaw === 'string' ? noteRaw.slice(0, 2000) : '';
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    try {
        const cart = await ensureCart(ctx.shop, ctx.locale);
        const adapter = resolveCartProvider(ctx.shop);
        const updated = await adapter.updateNote({ cartId: cart.id, shop: ctx.shop, locale: ctx.locale, note });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

export async function updateAttributesAction(formData: FormData): Promise<CartActionResult> {
    const raw = formData.get('attributes');
    if (typeof raw !== 'string') {
        return { ok: false, reason: 'invalid-code', message: await localizedMessage('invalid-code') };
    }
    let attributes: Array<{ key: string; value: string }>;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('not an array');
        attributes = parsed.filter((a) => a && typeof a.key === 'string' && typeof a.value === 'string');
    } catch {
        return { ok: false, reason: 'invalid-code', message: await localizedMessage('invalid-code') };
    }
    const ctx = await getRequestContext();
    if (!ctx) return { ok: false, reason: 'missing-shop', message: await localizedMessage('missing-shop') };
    try {
        const cart = await ensureCart(ctx.shop, ctx.locale);
        const adapter = resolveCartProvider(ctx.shop);
        const updated = await adapter.updateAttributes({
            cartId: cart.id,
            shop: ctx.shop,
            locale: ctx.locale,
            attributes,
        });
        revalidateCart(updated.id);
        return { ok: true, cart: updated };
    } catch (error) {
        return mapAdapterError(error);
    }
}

'use server';

import { trace } from '@opentelemetry/api';
import { revalidateTag } from 'next/cache';
import type { CartActionResult } from '@/pages/_actions/cart.types';
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

/**
 * Resolve shop + locale from the tenant headers set by `middleware/storefront.ts`.
 * Server actions execute in the route's request context, so the same headers
 * the page saw are available here.
 */
async function resolveShopLocale(): Promise<{ shopId: string; localeCode: string } | null> {
    const ctx = await getRequestContext();
    if (!ctx) return null;
    return { shopId: ctx.shop.id, localeCode: ctx.locale.code };
}

/**
 * Emit the per-tenant, per-cart revalidation tag so any server-side cart cache
 * invalidates. No consumer reads this tag today (cart is client-only via
 * hydrogen-react), but the tag namespace is stable for the future migration.
 */
function revalidateCart(cartId: string, shopId: string): void {
    revalidateTag(`cart:${cartId}`, 'max');
    revalidateTag(`shopify.${shopId}.cart`, 'max');
}

/**
 * Server action: add a line to the cart.
 *
 * NOTE — v2 stepping-stone. The actual Shopify mutation is performed
 * client-side via hydrogen-react's `useCart().linesAdd` after this action
 * returns `{ ok: true }`. This action's job is to (a) validate the form
 * payload at the server boundary, (b) ensure the request is in a known
 * tenant context, and (c) issue the revalidation tag so future server-side
 * cart caches will invalidate. The "ack and apply" pattern is documented in
 * Task 7.2 of the v2 plan.
 *
 * Expected form fields:
 *   - `variantId`  (required) — Shopify ProductVariant GID
 *   - `quantity`   (optional, default 1)
 *   - `cartId`     (optional) — current client cart id, echoed back for correlation
 */
export async function addToCartAction(formData: FormData): Promise<CartActionResult> {
    const variantId = parseId(formData.get('variantId'));
    if (!variantId) return { ok: false, reason: 'missing-variant' };

    const quantity = parseQuantity(formData.get('quantity'), 1);
    if (quantity == null || quantity < 1) return { ok: false, reason: 'invalid-quantity' };

    const ctx = await resolveShopLocale();
    if (!ctx) return { ok: false, reason: 'missing-shop' };

    const cartId = parseId(formData.get('cartId')) ?? null;

    trace.getActiveSpan()?.addEvent('cart_action.add', {
        'shop.id': ctx.shopId,
        'locale.code': ctx.localeCode,
        'cart.id': cartId ?? '',
        'variant.id': variantId,
        'line.quantity': quantity,
    });

    if (cartId) revalidateCart(cartId, ctx.shopId);

    return { ok: true, ...(cartId ? { cartId } : {}) };
}

/**
 * Server action: update an existing cart line's quantity. A quantity of 0
 * is accepted and treated as a remove request — clients may prefer
 * `removeCartLineAction` directly, but Shopify's `linesUpdate` accepts it.
 *
 * Expected form fields:
 *   - `lineId`    (required) — Shopify CartLine id
 *   - `quantity`  (required) — non-negative integer
 *   - `cartId`    (required) — current client cart id
 */
export async function updateCartLineQuantityAction(formData: FormData): Promise<CartActionResult> {
    const lineId = parseId(formData.get('lineId'));
    if (!lineId) return { ok: false, reason: 'missing-line' };

    const rawQuantity = formData.get('quantity');
    const quantity = parseQuantity(rawQuantity, Number.NaN);
    if (quantity == null || Number.isNaN(quantity)) return { ok: false, reason: 'invalid-quantity' };

    const ctx = await resolveShopLocale();
    if (!ctx) return { ok: false, reason: 'missing-shop' };

    const cartId = parseId(formData.get('cartId'));
    if (!cartId) return { ok: false, reason: 'missing-cart' };

    trace.getActiveSpan()?.addEvent('cart_action.update_quantity', {
        'shop.id': ctx.shopId,
        'locale.code': ctx.localeCode,
        'cart.id': cartId,
        'line.id': lineId,
        'line.quantity': quantity,
    });

    revalidateCart(cartId, ctx.shopId);

    return { ok: true, cartId };
}

/**
 * Server action: remove a line from the cart.
 *
 * Expected form fields:
 *   - `lineId`  (required) — Shopify CartLine id
 *   - `cartId`  (required) — current client cart id
 */
export async function removeCartLineAction(formData: FormData): Promise<CartActionResult> {
    const lineId = parseId(formData.get('lineId'));
    if (!lineId) return { ok: false, reason: 'missing-line' };

    const ctx = await resolveShopLocale();
    if (!ctx) return { ok: false, reason: 'missing-shop' };

    const cartId = parseId(formData.get('cartId'));
    if (!cartId) return { ok: false, reason: 'missing-cart' };

    trace.getActiveSpan()?.addEvent('cart_action.remove', {
        'shop.id': ctx.shopId,
        'locale.code': ctx.localeCode,
        'cart.id': cartId,
        'line.id': lineId,
    });

    revalidateCart(cartId, ctx.shopId);

    return { ok: true, cartId };
}

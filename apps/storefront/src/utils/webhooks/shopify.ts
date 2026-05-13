import { createHmac, timingSafeEqual } from 'node:crypto';

export function validateShopifyHmac(rawBody: string, headerHmac: string, secret: string): boolean {
    const computed = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
    const a = Buffer.from(computed);
    const b = Buffer.from(headerHmac);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

type ShopifyWebhookBody = { handle?: string; [key: string]: unknown };

// Shopify product/collection/page handles match `^[a-z0-9](-?[a-z0-9])*$`
// (kebab-case, ASCII). Anything outside that is either a bug upstream or a
// crafted payload aiming to inject characters into the tag string we then
// hand to `revalidateTag`. Reject those — fall back to broad sweep — so the
// tag namespace stays predictable and a malformed handle can't be used to
// invalidate cross-tenant tags by collision.
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,254}[a-z0-9])?$/;
const isValidHandle = (h: unknown): h is string => typeof h === 'string' && HANDLE_PATTERN.test(h);

export function parseShopifyWebhook({
    shop,
    topic,
    body,
}: {
    shop: { id: string };
    topic: string;
    body: ShopifyWebhookBody;
}): string[] {
    const broad = `shopify.${shop.id}`;
    const handle = isValidHandle(body.handle) ? body.handle : undefined;

    // `*.products` / `*.collections` (plural) are the tags storefront list
    // pages — `/products`, `/collections/<x>` listings, recommendation rails,
    // etc. — cache against. Without re-emitting them on the per-entity
    // webhook the single-entity pages refresh but the list pages stay stale
    // until the cache lifetime hits, which on long ISR windows means
    // "indefinitely from the user's perspective."
    if (topic.startsWith('products/')) {
        const list = `shopify.${shop.id}.products`;
        if (handle) return [`shopify.${shop.id}.product.${handle}`, list, broad];
        return [list, broad];
    }

    if (topic.startsWith('collections/')) {
        const list = `shopify.${shop.id}.collections`;
        if (handle) return [`shopify.${shop.id}.collection.${handle}`, list, broad];
        return [list, broad];
    }

    if (topic.startsWith('pages/')) {
        if (handle) return [`shopify.${shop.id}.page.${handle}`, broad];
        return [broad];
    }

    if (!topic.startsWith('inventory_levels/')) {
        console.warn(`[shopify webhook] unknown topic "${topic}" — falling back to broad sweep`);
    }
    // inventory_levels/update and other topics — broad sweep.
    // Variant-to-product resolution would require an extra Shopify call.
    return [broad];
}

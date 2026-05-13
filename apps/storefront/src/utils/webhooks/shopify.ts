import { createHmac, timingSafeEqual } from 'node:crypto';

export function validateShopifyHmac(rawBody: string, headerHmac: string, secret: string): boolean {
    const computed = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
    const a = Buffer.from(computed);
    const b = Buffer.from(headerHmac);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

type ShopifyWebhookBody = { handle?: string; [key: string]: unknown };

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

    // `*.products` / `*.collections` (plural) are the tags storefront list
    // pages — `/products`, `/collections/<x>` listings, recommendation rails,
    // etc. — cache against. Without re-emitting them on the per-entity
    // webhook the single-entity pages refresh but the list pages stay stale
    // until the cache lifetime hits, which on long ISR windows means
    // "indefinitely from the user's perspective."
    if (topic.startsWith('products/')) {
        const list = `shopify.${shop.id}.products`;
        if (body.handle) return [`shopify.${shop.id}.product.${body.handle}`, list, broad];
        return [list, broad];
    }

    if (topic.startsWith('collections/')) {
        const list = `shopify.${shop.id}.collections`;
        if (body.handle) return [`shopify.${shop.id}.collection.${body.handle}`, list, broad];
        return [list, broad];
    }

    if (topic.startsWith('pages/')) {
        if (body.handle) return [`shopify.${shop.id}.page.${body.handle}`, broad];
        return [broad];
    }

    if (!topic.startsWith('inventory_levels/')) {
        console.warn(`[shopify webhook] unknown topic "${topic}" — falling back to broad sweep`);
    }
    // inventory_levels/update and other topics — broad sweep.
    // Variant-to-product resolution would require an extra Shopify call.
    return [broad];
}

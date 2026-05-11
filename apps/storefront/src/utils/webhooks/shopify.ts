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

    if (topic.startsWith('products/')) {
        if (body.handle) return [`shopify.${shop.id}.product.${body.handle}`, broad];
        return [broad];
    }

    if (topic.startsWith('collections/')) {
        if (body.handle) return [`shopify.${shop.id}.collection.${body.handle}`, broad];
        return [broad];
    }

    // inventory_levels/update and other topics — broad sweep.
    // Variant-to-product resolution would require an extra Shopify call.
    return [broad];
}

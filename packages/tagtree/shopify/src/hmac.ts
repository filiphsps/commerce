import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyShopifyHmac(rawBody: string, headerHmac: string | null, secret: string): boolean {
    if (!headerHmac) return false;
    const computed = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
    const a = Buffer.from(computed);
    const b = Buffer.from(headerHmac);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

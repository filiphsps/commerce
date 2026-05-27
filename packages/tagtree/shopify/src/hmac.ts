import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies a Shopify webhook HMAC signature using a constant-time byte comparison to guard against timing attacks.
 *
 * @param rawBody - Raw, unmodified request body string; must be read before any JSON parsing or transformation.
 * @param headerHmac - The `X-Shopify-Hmac-Sha256` header value from the incoming request; `null` causes immediate rejection without computing a digest.
 * @param secret - The Shopify webhook shared secret for the app installation, used as the SHA-256 HMAC key.
 * @returns `true` when the computed digest matches the header value; `false` when the header is absent, the byte lengths differ, or the digest does not match.
 * @example
 * ```ts
 * const valid = verifyShopifyHmac(
 *     rawBody,
 *     request.headers.get('x-shopify-hmac-sha256'),
 *     process.env.SHOPIFY_WEBHOOK_SECRET!,
 * );
 * if (!valid) return new Response('Forbidden', { status: 403 });
 * ```
 */
export function verifyShopifyHmac(rawBody: string, headerHmac: string | null, secret: string): boolean {
    if (!headerHmac) return false;
    const computed = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
    const a = Buffer.from(computed);
    const b = Buffer.from(headerHmac);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

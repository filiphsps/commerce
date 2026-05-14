import { Shop } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { parseShopifyWebhook, validateShopifyHmac } from '@/utils/webhooks/shopify';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export type RevalidateApiRouteParams = Promise<{ domain: string }>;

type RevalidateShop = {
    id: string;
    domain: string;
    commerceProvider?: { type?: string; authentication?: { domain?: string } };
};

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    const { domain } = await params;
    let shop: RevalidateShop;
    try {
        shop = (await Shop.findByDomain(domain)) as RevalidateShop;
    } catch (error: unknown) {
        // Distinguish "shop truly doesn't exist" from "infra blip" (Mongo
        // timeout, replica-set election, connection pool saturation). The
        // 404 path is permanent from Shopify's perspective — its webhook
        // retry policy treats 4xx as "do not retry," so the cache bust is
        // silently dropped. Map infra failures to 503 + Retry-After so the
        // delivery is re-queued.
        if (CommerceError.isNotFound(error)) {
            return NextResponse.json(
                { status: 404, error: 'shop not found' },
                { status: 404, headers: noStoreHeaders },
            );
        }
        console.error('[revalidate] Shop.findByDomain failed:', error);
        return NextResponse.json(
            { status: 503, error: 'shop lookup failed' },
            { status: 503, headers: { ...noStoreHeaders, 'Retry-After': '30' } },
        );
    }

    const rawBody = await req.text();
    const headerHmac = req.headers.get('x-shopify-hmac-sha256');

    // Shopify webhook
    if (headerHmac) {
        const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
        if (!secret) {
            // Missing secret means we cannot verify Shopify origin. The
            // previous logging-only fallback would silently keep working in
            // prod if the env var was dropped, leaving the endpoint open to
            // anyone with a domain in the table — they could thrash the
            // cache with no auth. Reject hard outside of dev so it surfaces
            // in monitoring instead of being a stealth foot-gun.
            if (process.env.NODE_ENV !== 'development') {
                return NextResponse.json(
                    { status: 503, error: 'SHOPIFY_WEBHOOK_SECRET is not configured' },
                    { status: 503, headers: noStoreHeaders },
                );
            }
            console.warn(
                '[revalidate] SHOPIFY_WEBHOOK_SECRET is not set — accepting Shopify webhook without HMAC validation. This is permitted in dev only.',
            );
        } else if (!validateShopifyHmac(rawBody, headerHmac, secret)) {
            return NextResponse.json({ status: 401, error: 'invalid HMAC' }, { status: 401, headers: noStoreHeaders });
        }

        // Cross-check the Shopify origin against the resolved shop. The HMAC
        // proves the body came from Shopify, but with a single shared
        // SHOPIFY_WEBHOOK_SECRET an HMAC-valid delivery for store A could
        // be replayed against store B's revalidate URL — which would burst
        // store B's cache and let an attacker DoS unrelated tenants. Pin the
        // request to the shop whose `commerceProvider.authentication.domain`
        // matches the Shopify-sent header.
        const headerShopDomain = req.headers.get('x-shopify-shop-domain')?.trim().toLowerCase();
        const shopOriginDomain = shop.commerceProvider?.authentication?.domain?.trim().toLowerCase();
        if (headerShopDomain && shopOriginDomain && headerShopDomain !== shopOriginDomain) {
            return NextResponse.json(
                { status: 401, error: 'shop-domain mismatch' },
                { status: 401, headers: noStoreHeaders },
            );
        }

        const topic = req.headers.get('x-shopify-topic') ?? 'unknown';
        let body: Record<string, unknown> = {};
        try {
            body = JSON.parse(rawBody);
        } catch {
            // body parse failure — broad sweep below
        }

        const tags = parseShopifyWebhook({ shop, topic, body });
        for (const tag of tags) revalidateTag(tag, 'max');

        return NextResponse.json({ status: 200, tags }, { status: 200, headers: noStoreHeaders });
    }

    return NextResponse.json({ status: 400, error: 'unrecognised webhook' }, { status: 400, headers: noStoreHeaders });
}

export async function GET() {
    return NextResponse.json({ status: 200 }, { status: 200, headers: noStoreHeaders });
}

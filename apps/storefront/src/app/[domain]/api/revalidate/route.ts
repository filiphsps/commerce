import { Shop } from '@nordcom/commerce-db';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { parsePrismicWebhook } from '@/utils/webhooks/prismic';
import { parseShopifyWebhook, validateShopifyHmac } from '@/utils/webhooks/shopify';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export type RevalidateApiRouteParams = Promise<{ domain: string }>;

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    const { domain } = await params;
    let shop: { id: string; domain: string };
    try {
        shop = await Shop.findByDomain(domain);
    } catch {
        return NextResponse.json({ status: 404, error: 'shop not found' }, { status: 404, headers: noStoreHeaders });
    }

    const rawBody = await req.text();
    const headerHmac = req.headers.get('x-shopify-hmac-sha256');

    // Shopify webhook
    if (headerHmac) {
        const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
        if (!secret) {
            console.warn(
                'SHOPIFY_WEBHOOK_SECRET is not set — accepting Shopify webhook without HMAC validation (dev mode).',
            );
        } else if (!validateShopifyHmac(rawBody, headerHmac, secret)) {
            return NextResponse.json({ status: 401, error: 'invalid HMAC' }, { status: 401, headers: noStoreHeaders });
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

    // Prismic webhook
    let body: Record<string, unknown> = {};
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ status: 400, error: 'invalid JSON body' }, { status: 400, headers: noStoreHeaders });
    }

    if (Array.isArray((body as { documents?: unknown[] }).documents)) {
        const tags = parsePrismicWebhook({
            shop,
            body: body as { documents: Array<{ id: string; uid?: string; type: string }> },
        });
        for (const tag of tags) revalidateTag(tag, 'max');
        return NextResponse.json({ status: 200, tags }, { status: 200, headers: noStoreHeaders });
    }

    return NextResponse.json({ status: 400, error: 'unknown webhook shape' }, { status: 400, headers: noStoreHeaders });
}

export async function GET(_req: NextRequest, _ctx: { params: RevalidateApiRouteParams }) {
    // Prismic webhook test pings use GET. Acknowledge without revalidating.
    return NextResponse.json({ status: 200 }, { status: 200, headers: noStoreHeaders });
}

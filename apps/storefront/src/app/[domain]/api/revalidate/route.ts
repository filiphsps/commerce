import { Shop } from '@nordcom/commerce-db';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
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

    return NextResponse.json(
        { status: 400, error: 'unrecognised webhook' },
        { status: 400, headers: noStoreHeaders },
    );
}

export async function GET() {
    return NextResponse.json({ status: 200 }, { status: 200, headers: noStoreHeaders });
}

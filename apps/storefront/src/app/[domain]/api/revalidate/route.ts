import { Shop } from '@nordcom/commerce-db';
import { parseShopifyWebhook, verifyShopifyHmac } from '@tagtree/shopify';
import { type NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export type RevalidateApiRouteParams = Promise<{ domain: string }>;

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    const { domain } = await params;
    let shop: Awaited<ReturnType<typeof Shop.findByDomain>>;
    try {
        shop = await Shop.findByDomain(domain);
    } catch {
        return NextResponse.json({ status: 404, error: 'shop not found' }, { status: 404, headers: noStoreHeaders });
    }

    const rawBody = await req.text();
    const headerHmac = req.headers.get('x-shopify-hmac-sha256');

    if (headerHmac) {
        const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
        if (!secret) {
            // Missing secret means we cannot verify Shopify origin. In prod we
            // reject hard so a missing env var surfaces in monitoring instead
            // of silently leaving the endpoint open to anyone with a domain
            // in the table.
            if (process.env.NODE_ENV !== 'development') {
                return NextResponse.json(
                    { status: 503, error: 'SHOPIFY_WEBHOOK_SECRET is not configured' },
                    { status: 503, headers: noStoreHeaders },
                );
            }
            console.warn(
                '[revalidate] SHOPIFY_WEBHOOK_SECRET is not set — accepting Shopify webhook without HMAC validation. This is permitted in dev only.',
            );
        } else if (!verifyShopifyHmac(rawBody, headerHmac, secret)) {
            return NextResponse.json({ status: 401, error: 'invalid HMAC' }, { status: 401, headers: noStoreHeaders });
        }

        const topic = req.headers.get('x-shopify-topic') ?? 'unknown';
        let body: Record<string, unknown> = {};
        try {
            body = JSON.parse(rawBody);
        } catch {
            // body parse failure — broad sweep below
        }

        const tags = parseShopifyWebhook({ schema: cache, tenant: shop, topic, body });

        if (tags.length === 0) {
            // Unknown topic / unparseable body → broad-sweep at the tenant root.
            // This preserves the old route's silent broad-sweep behavior, but
            // moves the decision out of the parser (where it used to be hidden)
            // and into the caller's explicit control.
            await cache.invalidate.tenant(shop);
            return NextResponse.json({ status: 200, tags: 'broad-sweep' }, { status: 200, headers: noStoreHeaders });
        }

        await cache.invalidateRaw(tags);
        return NextResponse.json({ status: 200, tags }, { status: 200, headers: noStoreHeaders });
    }

    return NextResponse.json({ status: 400, error: 'unrecognised webhook' }, { status: 400, headers: noStoreHeaders });
}

export async function GET() {
    return NextResponse.json({ status: 200 }, { status: 200, headers: noStoreHeaders });
}

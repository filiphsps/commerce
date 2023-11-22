import { ShopApi } from '@/api/shop';
import { ApiError, MethodNotAllowedError, UnknownApiError } from '@/utils/errors';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

const headers = { 'Cache-Control': 'no-store' };

export type RevalidateApiRouteParams = {
    domain: string;
};
const revalidate = async (req: NextRequest, params: RevalidateApiRouteParams) => {
    const shop = await ShopApi({ domain: params.domain });

    let body = {};
    try {
        const shopify = {
            triggeredAt: req.headers.get('X-Shopify-Triggered-At'),
            domain: req.headers.get('X-Shopify-Shop-Domain'),
            topic: req.headers.get('X-Shopify-Topic'),
            webhookId: req.headers.get('X-Shopify-Webhook-Id'),
            apiVersion: req.headers.get('X-Shopify-API-Version')
        };
        console.warn(JSON.stringify({ shopify, params }, null, 4));

        body = await req.json();
        console.warn(body);

        // TODO: Revalidate either depending on the topic or the body.
        // TODO: Support revalidating subtype (e.g. `namespace.shop.type`).
        revalidateTag(`prismic.${shop.id}`);
        revalidateTag(`shopify.${shop.id}`);

        // revalidateTag(domain);
    } catch (error: unknown) {
        if (error instanceof ApiError) {
            return NextResponse.json(
                {
                    status: error.statusCode,
                    data: null,
                    errors: [error]
                },
                { status: error.statusCode, headers }
            );
        }

        const fallback = new UnknownApiError();
        return NextResponse.json(
            {
                status: fallback.statusCode,
                data: null,
                errors: [fallback]
            },
            { status: fallback.statusCode, headers }
        );
    }

    // TODO: API response builder or similar.
    return NextResponse.json(
        {
            status: 200,
            data: {
                revalidated: true
            },
            errors: null
        },
        { status: 200, headers }
    );
};

export async function GET(_: NextRequest, {}: { params: RevalidateApiRouteParams }) {
    const error = new MethodNotAllowedError();

    return NextResponse.json(
        {
            status: error.statusCode,
            data: null,
            errors: [error]
        },
        { status: error.statusCode, headers }
    );
}

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return revalidate(req, params);
}

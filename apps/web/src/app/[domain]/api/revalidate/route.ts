import { ShopApi } from '@nordcom/commerce-database';
import { Error, MethodNotAllowedError, UnknownApiError } from '@nordcom/commerce-errors';
import { revalidateTag, unstable_cache } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

export type RevalidateApiRouteParams = {
    domain: string;
};
const revalidate = async (req: NextRequest, { domain }: RevalidateApiRouteParams) => {
    // TODO: Revalidate either depending on the topic or the body.
    // TODO: Support revalidating subtype (e.g. `namespace.shop.type`).

    try {
        const shop = await ShopApi(domain, unstable_cache);
        //TODO: Do this in the correct place.
        revalidateTag(`shopify`);
        revalidateTag('prismic');
        revalidateTag(shop.id);

        switch (req.method) {
            case 'POST': {
                // TODO: Validate API type and authenticity.
                revalidateTag(`shopify.${shop.id}`);
                console.debug(`Revalidated shopify for shop with id ${shop.id}`);

                const data = await req.json();
                console.warn(JSON.stringify({ ...data }, null, 4));

                return NextResponse.json(
                    {
                        status: 200,
                        data: {
                            revalidated: true,
                            tags: [`shopify.${shop.id}`],
                            paths: [],
                            domains: [domain]
                        },
                        errors: null
                    },
                    { status: 200, headers }
                );
            }
            case 'GET': {
                // FIXME: This is incorrect, prismic also uses POST.
                revalidateTag(`prismic.${shop.id}`);
                console.debug(`Revalidated prismic for shop with id ${shop.id}`);

                return NextResponse.json(
                    {
                        status: 200,
                        data: {
                            revalidated: true,
                            tags: [`prismic.${shop.id}`],
                            paths: [domain]
                        },
                        errors: null
                    },
                    { status: 200, headers }
                );
            }
            default:
                throw new MethodNotAllowedError(req.method);
        }
    } catch (error: unknown) {
        switch (true) {
            // Switch case to let us easily add more specific error handling.
            case error instanceof Error:
                return NextResponse.json(
                    {
                        status: error.statusCode ?? 500,
                        data: null,
                        errors: [error]
                    },
                    { status: error.statusCode ?? 500 }
                );
        }

        const ex = new UnknownApiError();
        return NextResponse.json(
            {
                status: ex.statusCode,
                data: null,
                errors: [error, ex]
            },
            { status: ex.statusCode }
        );
    }
};

export async function GET(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return revalidate(req, params);
}

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return revalidate(req, params);
}

import { Shop } from '@nordcom/commerce-db';
import { Error, MethodNotAllowedError, TodoError } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = false;

const headers = { 'Cache-Control': 'no-store' };

export type RevalidateApiRouteParams = Promise<{
    domain: string;
}>;
const route = async (req: NextRequest, { domain }: Awaited<RevalidateApiRouteParams>) => {
    // TODO: Revalidate either depending on the topic or the body.
    // TODO: Support revalidating subtype (e.g. `namespace.shop.type`).

    try {
        const shop = await findShopByDomainOverHttp(domain);

        //TODO: Do this in the correct place.
        revalidateTag(shop.id);
        revalidateTag(shop.domain);
        revalidatePath('/en-US/homepage/', 'page'); // FIXME: Do this properly.

        switch (req.method) {
            case 'POST': {
                // TODO: Validate API type and authenticity.
                console.warn(`Revalidated shopify for shop with id ${shop.id}`);

                const data = await req.json();
                console.warn(JSON.stringify({ ...data }, null, 4));

                revalidateTag('shopify');

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
                console.warn(`Revalidated prismic for shop with id ${shop.id}`);

                revalidateTag('prismic');

                return NextResponse.json(
                    {
                        status: 200,
                        data: {
                            revalidated: true,
                            tags: [`prismic.${shop.id}`],
                            paths: [],
                            domains: [domain]
                        },
                        errors: null
                    },
                    { status: 200, headers }
                );
            }
            default: {
                throw new MethodNotAllowedError(req.method);
            }
        }
    } catch (error: unknown) {
        console.error(error);

        switch (true) {
            // Switch case to let us easily add more specific error handling.
            case error instanceof Error: {
                return NextResponse.json(
                    {
                        status: error.statusCode ?? 500,
                        data: null,
                        errors: [error]
                    },
                    { status: error.statusCode ?? 500 }
                );
            }
        }

        const ex = new TodoError();
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
    console.warn('revalidate GET', req.method, await req.nextUrl.searchParams, JSON.stringify(req.headers));
    return route(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    const { domain } = await params;
    const shop = await Shop.findByDomain(domain);

    const userAgent = req.headers.get('user-agent');
    if (userAgent && userAgent.includes('Prismic')) {
        const body = await req.json();
        console.debug('prismic revalidation request', body);

        switch (body.type) {
            case 'api-update': {
                const _documents = body.documents;
                // TODO: Invalidate only the affected documents.
                revalidateTag(`prismic.${shop.id}`);
                return NextResponse.json({ status: 200 });
            }
            case 'test-trigger': {
                console.debug('prismic test-trigger', body);
                return NextResponse.json({ status: 200 });
            }
        }

        console.warn('unknown prismic revalidation request', body);
        return NextResponse.json({ status: 404 });
    }

    console.error('unknown revalidation request', req.method, await req.clone().text());
    return NextResponse.json({ status: 500 });
}

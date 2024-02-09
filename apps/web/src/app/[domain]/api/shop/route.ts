import { RestifyObject, ShopApi } from '@nordcom/commerce-database';
import { unstable_cache as cache } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export type PreviewApiRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: PreviewApiRouteParams }) {
    const shop = await ShopApi(domain, cache);

    return NextResponse.json({
        status: 200,
        data: RestifyObject(shop)
    });
}

import { withAppRouterHighlight } from '@/utils/config/highlight.app';
import { NextResponse, type NextRequest } from 'next/server';
import { shopifyAdminApi } from './shopify';

export const dynamic = 'force-dynamic';

export const GET = withAppRouterHighlight(async (req: NextRequest, _context) => {
    console.log('GET Shopify API', req);

    const searchParams = req.nextUrl.searchParams;

    return await shopifyAdminApi.auth.begin({
        shop: searchParams.get('shop') as string,
        callbackPath: '/admin/integrations/shopify/',
        rawRequest: req,
        isOnline: true
    });
});

export const POST = withAppRouterHighlight(async (req: NextRequest, _context) => {
    console.log('POST Shopify API', req.json());

    return NextResponse.json(
        {
            status: 500,
            data: null,
            errors: null
        },
        { status: 500 }
    );
});

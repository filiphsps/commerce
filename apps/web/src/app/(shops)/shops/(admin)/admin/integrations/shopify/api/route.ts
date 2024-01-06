import { NextResponse, type NextRequest } from 'next/server';
import { shopifyAdminApi } from './shopify';

export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest, _context: any) => {
    const searchParams = req.nextUrl.searchParams;

    try {
        const res = await shopifyAdminApi.auth.begin({
            shop: searchParams.get('shop') as string,
            callbackPath: '/admin/integrations/shopify/',
            rawRequest: req,
            isOnline: true
        });

        return res;
    } catch (error) {
        console.log('error', error);

        return NextResponse.json(
            {},
            {
                status: 500
            }
        );
    }
};

import { UnknownApiError } from '@nordcom/commerce-errors';
import { NextResponse, type NextRequest } from 'next/server';
import { shopifyAdminApi } from './shopify';

export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest, _context: any) => {
    const searchParams = req.nextUrl.searchParams;

    try {
        const res = await shopifyAdminApi.auth.begin({
            shop: shopifyAdminApi.utils.sanitizeShop(searchParams.get('shop') as string, true)!,
            callbackPath: '/admin/integrations/shopify/',
            isOnline: false,
            rawRequest: req
        });

        return res;
    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            {
                errors: [new UnknownApiError(error.message)]
            },
            {
                status: 500
            }
        );
    }
};

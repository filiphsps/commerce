import { UnknownApiError } from '@nordcom/commerce-errors';

import { NextResponse } from 'next/server';

import { shopifyAdminApi } from './shopify';

import type { NextRequest } from 'next/server';

export const GET = async (req: NextRequest, _context: any) => {
    const searchParams = req.nextUrl.searchParams;

    try {
        const res = await shopifyAdminApi.auth.begin({
            shop: shopifyAdminApi.utils.sanitizeShop(searchParams.get('shop') as string, true)!,
            callbackPath: '/integrations/shopify/api/',
            isOnline: false,
            rawRequest: req
        });

        return res;
    } catch (error: unknown) {
        console.error(error);

        return NextResponse.json(
            {
                errors: [new UnknownApiError((error as any)?.message)]
            },
            {
                status: 500
            }
        );
    }
};

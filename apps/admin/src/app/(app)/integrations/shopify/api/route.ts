import { ProviderFetchError } from '@nordcom/commerce-errors';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { shopifyAdminApi } from './shopify';

export const GET = async (req: NextRequest) => {
    if (!shopifyAdminApi) {
        return NextResponse.json(
            {
                errors: [
                    {
                        code: 'SHOPIFY_NOT_CONFIGURED',
                        message: 'Shopify integration is not configured on this deployment.',
                    },
                ],
            },
            { status: 503 },
        );
    }

    const searchParams = req.nextUrl.searchParams;

    try {
        const res = await shopifyAdminApi.auth.begin({
            shop: shopifyAdminApi.utils.sanitizeShop(searchParams.get('shop') as string, true)!,
            callbackPath: '/integrations/shopify/api/',
            isOnline: false,
            rawRequest: req,
        });

        return res;
    } catch (error: unknown) {
        console.error(error);

        return NextResponse.json(
            {
                errors: [new ProviderFetchError(error instanceof Error ? error.message : String(error))],
            },
            {
                status: 500,
            },
        );
    }
};

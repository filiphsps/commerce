import { ShopsApi } from '@/api/shop';
import { ShopifyApiClient, ShopifyApiConfig } from '@/api/shopify';
import { Locale } from '@/utils/locale';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export type HeartbeatApiRouteParams = {};
export async function GET(_req: NextRequest, {}: { params: HeartbeatApiRouteParams }) {
    // TODO: Verify that the request is coming from vercel otherwise just return a 200.

    const shops = await ShopsApi();
    await shops.map(async (shop) => {
        // TODO: Get the shop's default locale
        const locale = Locale.default;

        switch (shop.configuration.commerce.type) {
            case 'shopify': {
                const apiConfig = await ShopifyApiConfig({ shop, noHeaders: true });
                const _api = await ShopifyApiClient({ shop, locale, apiConfig });

                // TODO: Check if webhooks are set up. If not, set them up.
                break;
            }
            default:
                break;
        }
    });

    return NextResponse.json(
        {
            status: 200,
            data: {},
            errors: null
        },
        { status: 200 }
    );
}

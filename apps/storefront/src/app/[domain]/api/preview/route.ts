import { unstable_cache as cache } from 'next/cache';
import { draftMode } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

import { ShopApi } from '@nordcom/commerce-database';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { redirectToPreviewURL } from '@prismicio/next';

export type PreviewApiRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: PreviewApiRouteParams }) {
    const shop = await ShopApi(domain, cache);

    if (shop.contentProvider.type !== 'prismic') {
        // TODO: Handle non-Prismic content providers.
        return NextResponse.json({ status: 404 });
    }

    const client = createClient({ shop, locale: Locale.default });

    draftMode().enable();

    await redirectToPreviewURL({ client, request: req });
}

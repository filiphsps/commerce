import { findShopByDomainOverHttp } from '@/api/shop';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { redirectToPreviewURL } from '@prismicio/next';
import { draftMode } from 'next/headers';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export type PreviewApiRouteParams = {
    domain: string;
};
export async function GET(request: NextRequest, { params: { domain } }: { params: PreviewApiRouteParams }) {
    const locale = Locale.default;

    const shop = await findShopByDomainOverHttp(domain);
    if (shop.contentProvider.type !== 'prismic') {
        // TODO: Handle non-Prismic content providers.
        return NextResponse.json({ status: 404, message: 'Non-Prismic content providers are not supported.' });
    }

    const client = createClient({ shop, locale });

    // Enable Draft Mode by setting the cookie.
    draftMode().enable();

    return await redirectToPreviewURL({ client, request });
}

import { findShopByDomainOverHttp } from '@/api/shop';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { redirectToPreviewURL } from '@prismicio/next';
import { draftMode } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export type PreviewApiRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: PreviewApiRouteParams }) {
    const shop = await findShopByDomainOverHttp(domain);

    if (shop.contentProvider.type !== 'prismic') {
        // TODO: Handle non-Prismic content providers.
        return NextResponse.json({ status: 404, message: 'Non-Prismic content providers are not supported.' });
    }

    const client = createClient({ shop, locale: Locale.default });

    draftMode().enable();

    await redirectToPreviewURL({ client, request: req });
}

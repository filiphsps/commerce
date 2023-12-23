import { ShopApi } from '@/api/shop';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { redirectToPreviewURL } from '@prismicio/next';
import { draftMode } from 'next/headers';
import type { NextRequest } from 'next/server';

export type DraftApiRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: DraftApiRouteParams }) {
    const shop = await ShopApi(domain);
    const client = createClient({ shop, locale: Locale.default });

    draftMode().enable();

    await redirectToPreviewURL({ client, request: req });
}

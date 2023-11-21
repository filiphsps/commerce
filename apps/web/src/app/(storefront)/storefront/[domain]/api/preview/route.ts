import { ShopApi } from '@/api/shop';
import { createClient } from '@/prismic';
import { DefaultLocale } from '@/utils/locale';
import { redirectToPreviewURL } from '@prismicio/next';
import { draftMode } from 'next/headers';
import type { NextRequest } from 'next/server';

export type PreviewApiRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: PreviewApiRouteParams }) {
    const shop = await ShopApi({ domain });
    const client = createClient({ shop, locale: DefaultLocale() });

    draftMode().enable();

    await redirectToPreviewURL({ client, request: req });
}

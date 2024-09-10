import 'server-only';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiClient } from '@/api/shopify';
import { RedirectApi } from '@/api/shopify/redirects';
import { redirect, RedirectType } from 'next/navigation';

import type { Locale } from './locale';

/** @todo TODO: Should this be done in the middleware? */
export async function checkAndHandleRedirect({
    domain,
    locale,
    path
}: {
    domain: string;
    locale: Locale;
    path: string;
}) {
    const shop = await findShopByDomainOverHttp(domain);
    const api = await ShopifyApiClient({ shop, locale });

    const target = await RedirectApi({ api, path });
    if (!target) {
        return;
    }

    redirect(target, RedirectType.replace);
}

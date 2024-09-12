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
    let target: string | null = null;

    try {
        const shop = await findShopByDomainOverHttp(domain);
        const api = await ShopifyApiClient({ shop, locale });

        target = await RedirectApi({ api, path });
    } catch {}

    if (!target) {
        return;
    }

    redirect(target, RedirectType.replace);
}

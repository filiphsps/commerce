import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { notFound, RedirectType, redirect } from 'next/navigation';
import { ShopifyApiClient } from '@/api/shopify';
import { RedirectApi } from '@/api/shopify/redirects';

import type { Locale } from './locale';

/** @todo TODO: Should this be done in the middleware? */
export async function checkAndHandleRedirect({
    domain,
    locale,
    path,
}: {
    domain: string;
    locale: Locale;
    path: string;
}) {
    let target: string | null = null;

    try {
        let shop: Awaited<ReturnType<typeof Shop.findByDomain>>;
        try {
            shop = await Shop.findByDomain(domain, { convert: true });
        } catch (error: unknown) {
            if (Error.isNotFound(error)) {
                notFound();
            }

            console.error(error);
            throw error;
        }
        const api = await ShopifyApiClient({ shop, locale });

        target = await RedirectApi({ api, path });
    } catch {}

    if (!target) {
        return;
    }

    redirect(target, RedirectType.replace);
}

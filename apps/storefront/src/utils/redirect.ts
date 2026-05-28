import 'server-only';

import { Error } from '@nordcom/commerce-errors';
import { notFound, RedirectType, redirect } from 'next/navigation';
import { Shop } from '@/api/_shop-loader';
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

            throw error;
        }
        const api = await ShopifyApiClient({ shop, locale });

        target = await RedirectApi({ api, path });
    } catch {}

    if (!target) {
        return;
    }

    // Guard against self-loops: RedirectsApi lowercases both path and target, so
    // a Shopify redirect from /products/Foo → /products/foo becomes path === target
    // after normalization. Without this check, redirect() would loop indefinitely.
    const normalize = (p: string) => p.toLowerCase().replace(/\/+$/, '');
    if (normalize(target) === normalize(path)) {
        notFound();
    }

    redirect(target, RedirectType.replace);
}

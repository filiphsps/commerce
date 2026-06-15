import 'server-only';

import { cache } from 'react';
import { Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionsApi } from '@/api/shopify/collection';
import { Locale } from '@/utils/locale';
import { TitleToHandle } from '@/utils/title-to-handle';

/**
 * Per-render, per-tenant set of existing collection handles.
 *
 * Keyed by the primitive `(domain, localeCode)` rather than the resolved shop/api objects so the
 * lookup dedupes across every product card on a page (each card builds its own api client, which
 * would defeat reference-keyed memoization). The Shopify query underneath is itself cache-tagged, so
 * repeated renders stay cheap. Resolves to an empty set on any fetch error, turning the existence
 * check into a clean fall-through rather than a thrown render.
 *
 * @param domain - Tenant hostname used to resolve the shop and api client.
 * @param localeCode - Active locale code.
 * @returns A set of every collection handle the storefront exposes.
 */
const collectionHandleSet = cache(async (domain: string, localeCode: string): Promise<ReadonlySet<string>> => {
    try {
        const shop = await Shop.findByDomain(domain);
        const api = await ShopifyApolloApiClient({ shop, locale: Locale.from(localeCode) });
        const collections = await CollectionsApi({ api });
        return new Set(collections.map(({ handle }) => handle));
    } catch {
        return new Set<string>();
    }
});

/**
 * Resolves the destination for a product's vendor/brand link.
 *
 * Prefers a curated collection whose handle matches the vendor (slugified the same way collection
 * handles are), and otherwise falls back to the all-products page with the vendor pre-selected as a
 * filter. The fallback always resolves to a live page, so the link is never dead on any tenant.
 *
 * @param options.domain - Tenant hostname.
 * @param options.locale - Active locale.
 * @param options.vendor - Raw vendor/brand name from the product.
 * @returns A trailing-slashed href: `/collections/<handle>/` when that collection exists, else
 *   `/products/?vendor=<vendor>`.
 */
export async function resolveVendorHref({
    domain,
    locale,
    vendor,
}: {
    domain: string;
    locale: Locale;
    vendor: string;
}): Promise<string> {
    const handle = TitleToHandle(vendor);
    if (handle) {
        const handles = await collectionHandleSet(domain, locale.code);
        if (handles.has(handle)) {
            return `/collections/${handle}/`;
        }
    }
    return `/products/?vendor=${encodeURIComponent(vendor)}`;
}

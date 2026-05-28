import 'server-only';

import { cache } from 'react';
import { ProductApi, Shop } from '@/api/_loaders';
import type { Product } from '@/api/product';
import { ShopifyApolloApiClient } from '@/api/shopify';
import type { ApiReturn } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';

/**
 * Resolves the PDP product through the pooled Apollo transport, cached per
 * `(domain, locale, handle)` so `generateMetadata` and the page render share a
 * SINGLE upstream fetch within a request.
 *
 * Previously `buildMetadata` fetched the product through the fetch-based
 * `ShopifyApiClient` while `ProductPage` used the Apollo-based
 * `ShopifyApolloApiClient` — two transports with no shared cache, so the same
 * product was fetched twice per request. Routing both through one Apollo
 * transport lets the pooled `InMemoryCache` (and the Data Cache) dedupe the
 * network call; keying this loader on PRIMITIVES (not the `{ api, handle }`
 * object the entity loaders take) lets `cache()` dedup actually hit across the
 * two call sites within a render pass.
 *
 * @param domain - Tenant hostname.
 * @param localeData - Serialized request locale.
 * @param handle - Product handle.
 * @returns A product result tuple — `[Product, undefined]` on success or `[undefined, error]` on failure.
 */
export const getPageProduct = cache(
    async (domain: string, localeData: string, handle: string): Promise<ApiReturn<Product>> => {
        const shop = await Shop.findByDomain(domain);
        const locale = Locale.from(localeData);
        const api = await ShopifyApolloApiClient({ shop, locale });
        return ProductApi({ api, handle });
    },
);

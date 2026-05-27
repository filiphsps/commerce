import 'server-only';

import { Error } from '@nordcom/commerce-errors';

import { Shop } from '@/api/_loaders';
import { ShopifyApiClient } from '@/api/shopify';
import { ProductsApi } from '@/api/shopify/product';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type ProductPageParams = Promise<{ domain: string; locale: string; handle: string }>;

/**
 * Generates the `handle` segments for products in a shop under a given
 * domain/locale pair at build time. Fetches a limited product set to keep
 * build-time rendering tractable; the rest are served via ISR. Returns a
 * sentinel entry when the catalog is empty so Cache Components always has
 * at least one path.
 *
 * @param params - The already-resolved `domain` and `locale` from the parent segment.
 * @returns An array of `{ handle }` objects for pre-rendered products.
 * @throws {unknown} When a non-404 Shopify error is encountered during product enumeration.
 */
export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<ProductPageParams>, 'handle'>;
}): Promise<Omit<Awaited<ProductPageParams>, 'domain' | 'locale'>[]> {
    const { domain, locale: localeData } = params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        return [{ handle: NOT_FOUND_HANDLE }];
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApiClient({ shop, locale });

    try {
        const { products } = await ProductsApi({ api, limit: 5 });
        return products.length > 0
            ? products.map(({ node: { handle } }) => ({ handle }))
            : [{ handle: NOT_FOUND_HANDLE }];
    } catch (error: unknown) {
        // Empty catalogs shouldn't fail the build; Cache Components requires at
        // least one entry, so we return a sentinel the runtime page 404s.
        if (Error.isNotFound(error)) return [{ handle: NOT_FOUND_HANDLE }];
        throw error;
    }
}

import 'server-only';

import { Error } from '@nordcom/commerce-errors';

import { Shop } from '@/api/_loaders';
import { ShopifyApiClient } from '@/api/shopify';
import { ProductHandlesApi } from '@/api/shopify/product';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type ProductPageParams = Promise<{ domain: string; locale: string; handle: string }>;

/**
 * Number of best-selling PDPs to pre-render per domain/locale at build time.
 * Each handle here triggers a full PDP render at build, and the warmer runs
 * once per tenant × locale, so this stays a modest top-N of the warmest pages;
 * the rest of the catalog is served via ISR on first request.
 */
const PREBUILT_PRODUCT_COUNT = 10;

/**
 * Generates the `handle` segments for products in a shop under a given
 * domain/locale pair at build time. Pre-renders only the top best-selling
 * products to keep build-time rendering tractable; the rest are served via
 * ISR. Reads handles through the handles-only {@link ProductHandlesApi} so the
 * warmer never pulls the full PDP payload just to enumerate handle strings.
 * Returns a sentinel entry when the catalog is empty so Cache Components always
 * has at least one path.
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
        const handles = await ProductHandlesApi({ api, limit: PREBUILT_PRODUCT_COUNT, sorting: 'BEST_SELLING' });
        return handles.length > 0 ? handles.map((handle) => ({ handle })) : [{ handle: NOT_FOUND_HANDLE }];
    } catch (error: unknown) {
        // Empty catalogs shouldn't fail the build; Cache Components requires at
        // least one entry, so we return a sentinel the runtime page 404s.
        if (Error.isNotFound(error)) return [{ handle: NOT_FOUND_HANDLE }];
        throw error;
    }
}

import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApiClient } from '@/api/shopify';
import { ProductsApi } from '@/api/shopify/product';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type ProductPageParams = Promise<{ domain: string; locale: string; handle: string }>;

export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<ProductPageParams>, 'handle'>;
}): Promise<Omit<Awaited<ProductPageParams>, 'domain' | 'locale'>[]> {
    const { domain, locale: localeData } = params;

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

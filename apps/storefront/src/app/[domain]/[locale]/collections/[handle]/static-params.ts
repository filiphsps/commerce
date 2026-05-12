import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionsApi } from '@/api/shopify/collection';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type CollectionPageParams = Promise<{ domain: string; locale: string; handle: string }>;

export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<CollectionPageParams>, 'handle'>;
}): Promise<Omit<Awaited<CollectionPageParams>, 'domain' | 'locale'>[]> {
    const { domain, locale: localeData } = params;

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    try {
        const collections = await CollectionsApi({ api });
        return collections.length > 0 ? collections.map(({ handle }) => ({ handle })) : [{ handle: NOT_FOUND_HANDLE }];
    } catch (error: unknown) {
        // Empty/missing catalog shouldn't fail the build; Cache Components
        // requires at least one entry, so we return a sentinel that 404s.
        if (Error.isNotFound(error)) return [{ handle: NOT_FOUND_HANDLE }];
        throw error;
    }
}

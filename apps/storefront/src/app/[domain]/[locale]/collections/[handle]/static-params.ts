import { Error } from '@nordcom/commerce-errors';

import { Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionsApi } from '@/api/shopify/collection';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type CollectionPageParams = Promise<{ domain: string; locale: string; handle: string }>;

/**
 * Generates the `handle` segments for all collections in a shop under a given
 * domain/locale pair at build time. Returns a sentinel entry when the catalog
 * is empty so Cache Components always has at least one path.
 *
 * @param params - The already-resolved `domain` and `locale` from the parent segment.
 * @returns An array of `{ handle }` objects, one per collection.
 * @throws {unknown} When a non-404 Shopify error is encountered during collection enumeration.
 */
export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<CollectionPageParams>, 'handle'>;
}): Promise<Omit<Awaited<CollectionPageParams>, 'domain' | 'locale'>[]> {
    const { domain, locale: localeData } = params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        return [{ handle: NOT_FOUND_HANDLE }];
    }

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

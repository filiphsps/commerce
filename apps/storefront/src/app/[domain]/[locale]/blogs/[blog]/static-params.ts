import 'server-only';

import { Error } from '@nordcom/commerce-errors';

import { Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogsApi } from '@/api/shopify/blog';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type BlogPageParams = Promise<{ domain: string; locale: string; blog: string }>;

/**
 * Generates the `blog` handle segments for all blogs in a shop under a given
 * domain/locale pair at build time. Returns a sentinel entry when the shop
 * has no blogs so Cache Components always has at least one path.
 *
 * @param params - The already-resolved `domain` and `locale` from the parent segment.
 * @returns An array of `{ blog }` objects, one per blog in the shop.
 * @throws {unknown} When a non-404 Shopify error is encountered during blog enumeration.
 */
export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<BlogPageParams>, 'blog'>;
}): Promise<Pick<Awaited<BlogPageParams>, 'blog'>[]> {
    const { domain, locale: localeData } = params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        return [{ blog: NOT_FOUND_HANDLE }];
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [blogs, blogsError] = await BlogsApi({ api });
    if (blogsError) {
        // Shops without any blogs shouldn't fail the build; Cache Components
        // requires at least one entry, so we return a sentinel that 404s.
        if (Error.isNotFound(blogsError)) {
            return [{ blog: NOT_FOUND_HANDLE }];
        }
        throw blogsError;
    }

    return blogs.length > 0 ? blogs.map(({ handle }) => ({ blog: handle })) : [{ blog: NOT_FOUND_HANDLE }];
}

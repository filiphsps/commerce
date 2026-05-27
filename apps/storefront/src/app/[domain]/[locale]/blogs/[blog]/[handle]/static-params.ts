import 'server-only';

import { Error } from '@nordcom/commerce-errors';

import { BlogApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { isValidHandle, NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type ArticlePageParams = Promise<{ domain: string; locale: string; blog: string; handle: string }>;

/**
 * Generates the `handle` segments for all articles in a given blog under a
 * domain/locale pair at build time. Returns a sentinel entry for missing or
 * invalid blogs so Cache Components always has at least one path.
 *
 * @param params - The already-resolved `domain`, `locale`, and `blog` handle from the parent segments.
 * @returns An array of `{ handle }` objects, one per article in the blog.
 * @throws {unknown} When a non-404 Shopify error is encountered during article enumeration.
 */
export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<ArticlePageParams>, 'handle'>;
}): Promise<Pick<Awaited<ArticlePageParams>, 'handle'>[]> {
    const { domain, locale: localeData, blog: blogHandle } = params;
    if (!domain || domain === NOT_FOUND_HANDLE || !isValidHandle(blogHandle)) {
        return [{ handle: NOT_FOUND_HANDLE }];
    }

    try {
        const locale = Locale.from(localeData);

        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        const api = await ShopifyApolloApiClient({ shop, locale });

        const [blog, blogError] = await BlogApi({ api, handle: blogHandle });
        if (blogError) {
            // Missing blog shouldn't fail the build; Cache Components requires at
            // least one entry, so we return a sentinel the runtime page 404s.
            if (Error.isNotFound(blogError)) {
                return [{ handle: NOT_FOUND_HANDLE }];
            }
            throw blogError;
        }

        const articles = blog.articles.edges.map(({ node: { handle } }) => ({ handle }));
        return articles.length > 0 ? articles : [{ handle: NOT_FOUND_HANDLE }];
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return [{ handle: NOT_FOUND_HANDLE }];
        }

        throw error;
    }
}

import 'server-only';

import { Error } from '@nordcom/commerce-errors';

import { BlogApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { isValidHandle, NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type ArticlePageParams = Promise<{ domain: string; locale: string; blog: string; handle: string }>;

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

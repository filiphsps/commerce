import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogsApi } from '@/api/shopify/blog';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type BlogPageParams = Promise<{ domain: string; locale: string; blog: string }>;

export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<BlogPageParams>, 'blog'>;
}): Promise<Pick<Awaited<BlogPageParams>, 'blog'>[]> {
    const { domain, locale: localeData } = params;
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

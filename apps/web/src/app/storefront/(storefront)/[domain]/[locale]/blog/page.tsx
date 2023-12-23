import { PageApi } from '@/api/page';
import { ShopApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { Error } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogContent from './blog-content';

export type BlogPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: BlogPageParams;
}): Promise<Metadata> {
    try {
        const shop = await ShopApi(domain);
        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const api = await ShopifyApolloApiClient({ shop, locale });
        const { page } = await PageApi({ shop, locale, handle: 'blog', type: 'custom_page' });
        const locales = await LocalesApi({ api });

        const title = page?.meta_title || page?.title || 'Blog'; // TODO: Fallback should respect i18n.
        const description: string | undefined =
            (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domains.primary}/${locale.code}/blog/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domains.primary}/${code}/blog/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/blog/`,
                type: 'website',
                title,
                description,
                siteName: shop.name,
                locale: locale.code,
                images:
                    (page?.meta_image && [
                        {
                            url: page?.meta_image!.url as string,
                            width: page?.meta_image!.dimensions?.width || 0,
                            height: page?.meta_image!.dimensions?.height || 0,
                            alt: page?.meta_image!.alt || '',
                            secureUrl: page?.meta_image!.url as string
                        }
                    ]) ||
                    undefined
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}

export default async function BlogPage({ params: { domain, locale: localeData } }: { params: BlogPageParams }) {
    try {
        const shop = await ShopApi(domain);
        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const api = await ShopifyApolloApiClient({ shop, locale });
        const { page } = await PageApi({ shop, locale, handle: 'blog', type: 'custom_page' });
        const blog = await BlogApi({ api, handle: 'news' });

        void Prefetch({ api, page });
        const i18n = await getDictionary(locale);

        return (
            <>
                <Heading title={page?.title} subtitle={page?.description} />
                <BlogContent blog={blog} shop={shop} locale={locale} i18n={i18n} />

                {page?.slices && page?.slices.length > 0 && (
                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        page={page}
                        i18n={i18n}
                        handle={'blog'}
                        type={'custom_page'}
                    />
                )}
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}
/* c8 ignore stop */

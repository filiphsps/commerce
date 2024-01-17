import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { Locale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import BlogContent from './blog-content';

export type BlogPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: BlogPageParams;
}): Promise<Metadata> {
    try {
        const shop = await ShopApi(domain, unstable_cache);
        const locale = Locale.from(localeData);
        if (!locale) notFound();

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
                canonical: `https://${shop.domain}/${locale.code}/blog/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/blog/`
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
            notFound();
        }

        throw error;
    }
}

export default async function BlogPage({ params: { domain, locale: localeData } }: { params: BlogPageParams }) {
    try {
        const shop = await ShopApi(domain, unstable_cache);
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const api = await ShopifyApolloApiClient({ shop, locale });
        const { page } = await PageApi({ shop, locale, handle: 'blog', type: 'custom_page' });

        void Prefetch({ api, page });

        const blog = await BlogApi({ api, handle: 'news' });
        const i18n = await getDictionary(locale);

        return (
            <>
                <Heading title={page?.title} subtitle={page?.description} />
                <BlogContent blog={blog} shop={shop} locale={locale} i18n={i18n} />

                {page?.slices && page?.slices.length > 0 && (
                    <Suspense>
                        <PrismicPage
                            shop={shop}
                            locale={locale}
                            page={page}
                            i18n={i18n}
                            handle={'blog'}
                            type={'custom_page'}
                        />
                    </Suspense>
                )}
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
/* c8 ignore stop */
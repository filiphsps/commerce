import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { Locale, useTranslation } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { notFound } from 'next/navigation';

import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';

import BlogContent from './blog-content';

import type { Metadata } from 'next';

export type BlogPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: BlogPageParams;
}): Promise<Metadata> {
    try {
        const shop = await Shop.findByDomain(domain);
        const locale = Locale.from(localeData);

        const api = await ShopifyApolloApiClient({ shop, locale });
        const page = await PageApi({ shop, locale, handle: 'blog' });
        const blog = await BlogApi({ api, handle: 'news' });
        const locales = await LocalesApi({ api });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n); // eslint-disable-line react-hooks/rules-of-hooks

        const title = page?.meta_title || page?.title || blog.seo?.title || t('blog');

        const description: string | undefined = asText(page?.meta_description) || page?.description || undefined;
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
                title: title!,
                description,
                siteName: shop.name,
                locale: locale.code,
                images: page?.meta_image
                    ? [
                          {
                              url: page.meta_image!.url as string,
                              width: page.meta_image!.dimensions?.width || 0,
                              height: page.meta_image!.dimensions?.height || 0,
                              alt: page.meta_image!.alt || '',
                              secureUrl: page.meta_image!.url as string
                          }
                      ]
                    : undefined
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
        const shop = await Shop.findByDomain(domain);
        const locale = Locale.from(localeData);

        const api = await ShopifyApolloApiClient({ shop, locale });
        const page = await PageApi({ shop, locale, handle: 'blog' });
        const blog = await BlogApi({ api, handle: 'news' });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        return (
            <>
                <Heading
                    title={page?.title || blog.title || t('blog')}
                    subtitle={page?.description || blog.seo?.description}
                />

                <BlogContent blog={blog} shop={shop} locale={locale} i18n={i18n} />

                {page?.slices && page.slices.length > 0 && (
                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        page={page}
                        handle={'blog'}
                        i18n={i18n}
                        type={'custom_page'}
                    />
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

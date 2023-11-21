import { ShopApi } from '@/api/shop';
import { StorefrontApiClient } from '@/api/shopify';
import { BlogArticleApi } from '@/api/shopify/blog';
import { StoreApi } from '@/api/store';
import Content from '@/components/Content';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { NextLocaleToLocale } from '@/utils/locale';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../../not-found';

/* c8 ignore start */

export type ArticlePageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ArticlePageParams;
}): Promise<Metadata> {
    try {
        const shop = await ShopApi({ domain });
        const locale = NextLocaleToLocale(localeData);
        if (!locale) return notFoundMetadata;

        const api = StorefrontApiClient({ shop, locale });
        const article = await BlogArticleApi({ api, blogHandle: 'news', handle });
        const store = await StoreApi({ shop, locale, api });
        const locales = store.i18n.locales;

        const title = article.seo?.title || article.title;
        const description = article.seo?.description || '';
        return {
            title,
            description,
            alternates: {
                canonical: `https://${domain}/${locale.locale}/blog/${handle}/`,
                languages: locales.reduce(
                    (prev, { locale }) => ({
                        ...prev,
                        [locale]: `https://${domain}/${locale}/blog/${handle}/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/blog/${handle}/`,
                type: 'website',
                title,
                description,
                siteName: store?.name,
                locale: locale.locale,
                images: []
            }
        };
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export default async function ArticlePage({
    params: { domain, locale: localeData, handle }
}: {
    params: ArticlePageParams;
}) {
    try {
        const shop = await ShopApi({ domain });
        const locale = NextLocaleToLocale(localeData);
        if (!locale) return notFound();

        const api = StorefrontApiClient({ shop, locale });
        const article = await BlogArticleApi({ api, blogHandle: 'news', handle });

        return (
            <Page>
                <PageContent primary>
                    <Heading title={article.title} subtitle={null} />

                    <Content dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }} />
                </PageContent>
            </Page>
        );
    } catch (error: any) {
        console.warn(error);
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFound();
        }

        throw error;
    }
}
/* c8 ignore stop */

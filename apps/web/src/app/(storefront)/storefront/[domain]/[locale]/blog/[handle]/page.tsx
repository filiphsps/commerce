import { ShopApi, ShopsApi } from '@/api/shop';
import { StorefrontApiClient } from '@/api/shopify';
import { BlogApi, BlogArticleApi } from '@/api/shopify/blog';
import { LocalesApi, StoreApi } from '@/api/store';
import { Page } from '@/components/layout/page';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { DefaultLocale, NextLocaleToLocale } from '@/utils/locale';
import type { Metadata } from 'next';
import { NewsArticleJsonLd } from 'next-seo';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../../not-found';
import styles from './page.module.scss';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
export async function generateStaticParams() {
    const locale = DefaultLocale()!;
    const shops = await ShopsApi();

    return (
        await Promise.all(
            shops.map(async (shop) => {
                const api = await StorefrontApiClient({ shop, locale });
                const locales = await LocalesApi({ api });

                return await Promise.all(
                    locales.map(async (locale) => {
                        const api = await StorefrontApiClient({ shop, locale });
                        const blog = await BlogApi({ api, handle: 'news' });

                        return blog.articles.edges.map(({ node: { handle } }) => ({
                            domain: shop.domains.primary,
                            locale: locale.locale,
                            handle
                        }));
                    })
                );
            })
        )
    ).flat(2);
}
/* c8 ignore stop */

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

        const api = await StorefrontApiClient({ shop, locale });
        const article = await BlogArticleApi({ api, blogHandle: 'news', handle });
        const store = await StoreApi({ api, locale });
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

        const api = await StorefrontApiClient({ shop, locale });
        const store = await StoreApi({ api, locale });
        const article = await BlogArticleApi({ api, blogHandle: 'news', handle });

        return (
            <Page className={styles.container}>
                <div className={styles.header}>
                    <Heading title={article.title} subtitle={null} />
                </div>

                <NewsArticleJsonLd
                    useAppDir
                    url={`https://${shop.domains.primary}/${locale.locale}/blog/${handle}/`}
                    description={article.seo?.description || article.excerpt || ''}
                    body={article.content}
                    title={article.title}
                    section="news"
                    images={[article.image?.url!]}
                    keywords={article.tags?.join(', ') || ''}
                    dateCreated={article.publishedAt}
                    datePublished={article.publishedAt}
                    authorName={article.authorV2?.name!}
                    publisherName={store.name}
                    publisherLogo={store.favicon?.src!}
                />

                <Content className={styles.content} dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }} />
            </Page>
        );
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFound();
        }

        console.error(error);
        throw error;
    }
}
/* c8 ignore stop */

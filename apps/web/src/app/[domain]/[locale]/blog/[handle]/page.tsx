import 'server-only';

import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi, BlogArticleApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { Label } from '@/components/typography/label';
import { Locale } from '@/utils/locale';
import { ShopApi, ShopsApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';
import type { Metadata } from 'next';
import { NewsArticleJsonLd } from 'next-seo';
import { unstable_cache as cache } from 'next/cache';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import styles from './page.module.scss';

export async function generateStaticParams() {
    const locale = Locale.default;
    const shops = await ShopsApi();

    const pages = (
        await Promise.all(
            shops
                .map(async (shop) => {
                    try {
                        const api = await ShopifyApiClient({ shop, locale });
                        const locales = await LocalesApi({ api });

                        return await Promise.all(
                            locales
                                .map(async (locale) => {
                                    try {
                                        const api = await ShopifyApiClient({ shop, locale });
                                        const blog = await BlogApi({ api, handle: 'news' });

                                        return blog.articles.edges.map(({ node: { handle } }) => ({
                                            domain: shop.domain,
                                            locale: locale.code,
                                            handle
                                        }));
                                    } catch {
                                        return null;
                                    }
                                })
                                .filter((_) => _)
                        );
                    } catch {
                        return null;
                    }
                })
                .filter((_) => _)
        )
    ).flat(2);

    return pages;
}

export type ArticlePageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ArticlePageParams;
}): Promise<Metadata> {
    try {
        const shop = await ShopApi(domain, cache);
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const api = await ShopifyApolloApiClient({ shop, locale });
        const article = await BlogArticleApi({ api, blogHandle: 'news', handle });
        const locales = await LocalesApi({ api });

        const title = article.seo?.title || article.title;
        const description = article.seo?.description || '';
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}/blog/${handle}/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/blog/${handle}/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/blog/${handle}/`,
                type: 'article',
                title,
                description,
                siteName: shop?.name,
                locale: locale.code,
                images: []
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
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
        const shop = await ShopApi(domain, cache);
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const api = await ShopifyApolloApiClient({ shop, locale });
        const article = await BlogArticleApi({ api, blogHandle: 'news', handle });

        return (
            <article>
                <div className={styles.header}>
                    <Heading
                        title={article.title}
                        subtitle={
                            <Label className={styles.date}>
                                {new Date(article.publishedAt).toLocaleDateString(locale as any, {
                                    weekday: undefined,
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Label>
                        }
                    />

                    {article.image ? (
                        <Image
                            className={styles.banner}
                            src={article.image.url}
                            alt={article.image.altText!}
                            width={350}
                            height={100}
                            sizes="(max-width: 950px) 200px, 350px"
                            priority={true}
                            loading="eager"
                            decoding="async"
                        />
                    ) : null}
                </div>

                <Content
                    className={styles.content}
                    dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }}
                    suppressHydrationWarning={true}
                />

                <Breadcrumbs shop={shop} title={article.title} />

                <NewsArticleJsonLd
                    useAppDir={true}
                    url={`https://${shop.domain}/${locale.code}/blog/${handle}/`}
                    description={article.seo?.description || article.excerpt || ''}
                    body={article.content}
                    title={article.title}
                    section="news"
                    images={[article.image?.url!]}
                    keywords={article.tags?.join?.(', ') || ''}
                    dateCreated={article.publishedAt}
                    datePublished={article.publishedAt}
                    authorName={article.authorV2?.name!}
                    publisherName={shop.name}
                    publisherLogo={shop.icons?.favicon?.src!}
                />
            </article>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

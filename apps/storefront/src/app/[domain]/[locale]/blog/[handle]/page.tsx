import 'server-only';

import styles from './page.module.scss';

import { unstable_cache as cache } from 'next/cache';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogArticleApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { title } from 'process';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { Label } from '@/components/typography/label';

import type { Metadata } from 'next';
import type { Article, WithContext } from 'schema-dts';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;

/*export async function generateStaticParams() {
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
}*/

export type ArticlePageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ArticlePageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) notFound();

        const shop = await ShopApi(domain, cache);
        const locale = Locale.from(localeData);

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
                siteName: shop.name,
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
        if (!isValidHandle(handle)) notFound();

        const shop = await ShopApi(domain, cache);
        const locale = Locale.from(localeData);

        const api = await ShopifyApolloApiClient({ shop, locale });
        const article = await BlogArticleApi({ api, blogHandle: 'news', handle });

        const jsonLd: WithContext<Article> = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            'url': `https://${shop.domain}/${locale.code}/blog/${handle}/`,
            'headline': title,
            'text': article.content,
            'description': article.seo?.description || article.excerpt || '',
            'articleSection': 'news',
            'image': [article.image?.url!],
            'keywords': article.tags.join(', '),
            'dateCreated': article.publishedAt,
            'datePublished': article.publishedAt,
            'author': {
                '@type': 'Person',
                'name': article.authorV2?.name!
            },
            'publisher': {
                '@type': 'Organization',
                'name': shop.name,
                'logo': {
                    '@type': 'ImageObject',
                    'url': shop.icons?.favicon?.src!
                }
            }
        };

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

                {/* Metadata */}
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            </article>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

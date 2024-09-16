import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogArticleApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { notFound, unstable_rethrow } from 'next/navigation';
import { title } from 'process';

import { JsonLd } from '@/components/json-ld';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { Label } from '@/components/typography/label';

import type { Article } from '@shopify/hydrogen-react/storefront-api-types';
import type { Metadata } from 'next';
import type { Article as LdArticle, WithContext } from 'schema-dts';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;

export type ArticlePageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ArticlePageParams;
}): Promise<Metadata> {
    if (!isValidHandle(handle)) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const api = await ShopifyApolloApiClient({ shop, locale });

    let article: Article;
    try {
        article = await BlogArticleApi({ api, blogHandle: 'news', handle });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }
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
}

export default async function ArticlePage({
    params: { domain, locale: localeData, handle }
}: {
    params: ArticlePageParams;
}) {
    if (!isValidHandle(handle)) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const api = await ShopifyApolloApiClient({ shop, locale });

    let article: Article;
    try {
        article = await BlogArticleApi({ api, blogHandle: 'news', handle });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    const jsonLd: WithContext<LdArticle> = {
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

    const publishedAt = new Date(article.publishedAt).toLocaleDateString(locale as any, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <article className="prose flex flex-col gap-6 md:max-w-[800px]">
            <header className="flex flex-col gap-2">
                <Label
                    as="div"
                    className="text-sm font-semibold leading-snug text-gray-600"
                    suppressHydrationWarning={true}
                >
                    {publishedAt}
                </Label>

                <Heading
                    titleClassName="text-3xl lg:text-4xl font-semibold leading-tight text-pretty text-black mb-0"
                    title={article.title}
                />
            </header>

            {article.image?.url ? (
                <div
                    role="presentation"
                    className="bg-gray h-32 w-full bg-cover bg-center bg-no-repeat object-cover object-center"
                    style={{ backgroundImage: `url('${article.image.url}')` }}
                />
            ) : null}

            <Content className="max-w-none" html={article.contentHtml} />

            {/* Metadata */}
            <JsonLd data={jsonLd} />
        </article>
    );
}

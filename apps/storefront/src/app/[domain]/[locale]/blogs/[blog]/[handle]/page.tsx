import 'server-only';

import { Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi, BlogArticleApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import { Content } from '@/components/typography/content';
import { Label } from '@/components/typography/label';

import type { Metadata } from 'next';
import type { Article as LdArticle, WithContext } from 'schema-dts';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;

export type ArticlePageParams = { domain: string; locale: string; blog: string; handle: string };

export async function generateStaticParams({
    params: { domain, locale: localeData }
}: {
    params: Omit<ArticlePageParams, 'handle'>;
}): Promise<Pick<ArticlePageParams, 'handle'>[]> {
    /** @note Limit pre-rendering when not in production. */
    if (process.env.VERCEL_ENV !== 'production') {
        return [];
    }

    const locale = Locale.from(localeData);

    const shop = await findShopByDomainOverHttp(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [blog, blogError] = await BlogApi({ api });
    if (blogError) {
        if (!Error.isNotFound(blogError)) {
            console.error(blogError);
        }

        return [];
    }

    return blog.articles.edges
        .map(({ node }) => node)
        .map(({ handle }) => ({
            handle
        }));
}

export async function generateMetadata({
    params: { domain, locale: localeData, blog: blogHandle, handle }
}: {
    params: ArticlePageParams;
}): Promise<Metadata> {
    if (!isValidHandle(handle)) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const api = await ShopifyApolloApiClient({ shop, locale });

    const [article, articleError] = await BlogArticleApi({ api, blogHandle, handle });
    if (articleError) {
        if (Error.isNotFound(articleError)) {
            notFound();
        }

        console.error(articleError);
        throw articleError;
    }

    const locales = await LocalesApi({ api });

    const title = article.seo?.title || article.title;
    const description = article.seo?.description || '';
    const image = article.image;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/blogs/${blogHandle}/${handle}/`,
            languages: locales.reduce(
                (prev, { code }) => ({
                    ...prev,
                    [code]: `https://${shop.domain}/${code}/blogs/${blogHandle}/${handle}/`
                }),
                {}
            )
        },
        openGraph: {
            url: `/blogs/${handle}/`,
            type: 'article',
            title,
            description,
            siteName: shop.name,
            locale: locale.code,
            images: image?.url
                ? [
                      {
                          url: image.url,
                          width: image.width!,
                          height: image.height!
                      }
                  ]
                : undefined
        }
    };
}

export default async function ArticlePage({
    params: { domain, locale: localeData, blog: blogHandle, handle }
}: {
    params: ArticlePageParams;
}) {
    if (!isValidHandle(blogHandle) || !isValidHandle(handle)) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const api = await ShopifyApolloApiClient({ shop, locale });

    const [article, articleError] = await BlogArticleApi({ api, blogHandle, handle });
    if (articleError) {
        if (Error.isNotFound(articleError)) {
            notFound();
        }

        console.error(articleError);
        throw articleError;
    }

    const { title, image, contentHtml, content, authorV2: author, publishedAt, seo, excerpt, tags } = article;

    const jsonLd: WithContext<LdArticle> = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'url': `https://${shop.domain}/${locale.code}/blogs/${blogHandle}/${handle}/`,
        'headline': title,
        'text': content,
        'description': seo?.description || excerpt || '',
        'articleSection': article.blog.title,
        'image': image?.url ? [image.url] : [],
        'keywords': ((tags as any) || []).join(', '),
        'dateCreated': publishedAt,
        'datePublished': publishedAt,
        'author': {
            '@type': 'Person',
            'name': author?.name!
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

    const publishedAtString = new Date(publishedAt).toLocaleDateString(locale as any, {
        weekday: undefined,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return (
        <>
            <Suspense key={`blog.${blogHandle}.${handle}.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.5rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={title} />
                </div>
            </Suspense>

            <header className="flex flex-col items-stretch justify-start gap-4">
                <h1 className="text-2xl md:text-4xl">{title}</h1>

                {image?.url ? (
                    <Image
                        role={image.altText ? undefined : 'presentation'}
                        src={image.url}
                        alt={image.altText!}
                        height={image.height!}
                        width={image.width!}
                        decoding="async"
                        loading={'eager'}
                        priority={true}
                        draggable={false}
                    />
                ) : null}
            </header>

            <section className="flex flex-col-reverse gap-6 md:grid md:grid-cols-[1fr_auto_1fr]">
                <aside className="md:h-full"></aside>

                <article className="prone md:max-w-[1024px]">
                    <Content html={contentHtml} />
                </article>

                <aside className="md:h-full">
                    {author ? (
                        <section>
                            <div className="text-sm font-bold leading-snug">by {author.name}</div>
                            <Label as="div" className="text-sm font-normal normal-case leading-snug text-gray-700">
                                {publishedAtString}
                            </Label>
                        </section>
                    ) : null}
                </aside>
            </section>

            {/* Metadata */}
            <JsonLd data={jsonLd} />
        </>
    );
}

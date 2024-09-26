import 'server-only';

import { Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi, BlogArticleApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/utils/dictionary';
import { isValidHandle } from '@/utils/handle';
import { getTranslations, Locale } from '@/utils/locale';
import md5 from 'crypto-js/md5';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar } from '@/components/informational/avatar';
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

export type ArticlePageParams = Promise<{ domain: string; locale: string; blog: string; handle: string }>;

export async function generateStaticParams({
    params
}: {
    params: Omit<ArticlePageParams, 'handle'>;
}): Promise<Pick<Awaited<ArticlePageParams>, 'handle'>[]> {
    /** @note Limit pre-rendering when not in production. */
    if (process.env.VERCEL_ENV !== 'production') {
        return [];
    }

    const { domain, locale: localeData } = await params;
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

export async function generateMetadata({ params }: { params: ArticlePageParams }): Promise<Metadata> {
    const { domain, locale: localeData, blog: blogHandle, handle } = await params;
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

export default async function ArticlePage({ params }: { params: ArticlePageParams }) {
    const { domain, locale: localeData, blog: blogHandle, handle } = await params;
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

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    const { title, image, contentHtml, content, authorV2: author, publishedAt, seo, excerpt, tags } = article;
    const avatar = author ? `https://www.gravatar.com/avatar/${md5(author.email)}.jpg?s=45&d=blank` : null;

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

    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    return (
        <>
            <Suspense key={`blog.${blogHandle}.${handle}.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={title} />
                </div>
            </Suspense>

            <header className="flex flex-col-reverse items-center justify-start gap-2 md:flex-col md:gap-3">
                <h1 className="text-2xl font-semibold md:text-3xl 2xl:text-center">{title}</h1>

                {image?.url ? (
                    <Image
                        className="overflow-hidden rounded-lg shadow 2xl:max-w-[70vw]"
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

            <section className="flex flex-col-reverse gap-1 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6">
                <aside className="w-full empty:hidden md:h-full empty:md:flex"></aside>

                <article className="prone md:max-w-[720px]">
                    <div className="flex items-center gap-2 pb-6 text-gray-500 *:text-sm *:font-semibold *:leading-tight md:pb-0">
                        <Label className="text-inherit">{publishedAtString}</Label>
                        {' • '}
                        <Label className="text-inherit">{t('n-min-read', readingTime)}</Label>
                    </div>

                    <Content className="prone max-w-none" html={contentHtml} />
                </article>

                <aside className="w-full md:h-full">
                    {author ? (
                        <div className="flex items-center justify-start gap-2">
                            {avatar ? <Avatar name={author.name} src={avatar} className="size-8" /> : null}
                            <div className="flex flex-col items-start justify-center gap-1">
                                <Label
                                    as="div"
                                    className="text-base font-normal normal-case leading-none text-gray-600"
                                >
                                    {author.name}
                                </Label>
                                {author.bio ? (
                                    <Label
                                        as="div"
                                        className="text-sm font-semibold normal-case leading-none text-gray-500"
                                    >
                                        {author.bio.startsWith('@') ? (
                                            <Link
                                                className="hover:text-primary transition-colors"
                                                href={`https://x.com/${author.bio}`}
                                                target="_blank"
                                            >
                                                {author.bio}
                                            </Link>
                                        ) : (
                                            author.bio
                                        )}
                                    </Label>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </aside>
            </section>

            {/* Metadata */}
            <JsonLd data={jsonLd} />
        </>
    );
}

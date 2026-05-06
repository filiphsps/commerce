import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';
import { flattenConnection, RichText } from '@shopify/hydrogen-react';
import md5 from 'crypto-js/md5';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi, BlogsApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { Avatar } from '@/components/informational/avatar';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { Card } from '@/components/layout/card';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { Label } from '@/components/typography/label';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type BlogPageParams = Promise<{ domain: string; locale: string; blog: string }>;

export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<BlogPageParams>, 'blog'>;
}): Promise<Pick<Awaited<BlogPageParams>, 'blog'>[]> {
    const { domain, locale: localeData } = params;

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [blogs, blogsError] = await BlogsApi({ api });
    if (blogsError) {
        throw blogsError;
    }

    if (blogs.length === 0) {
        throw new NotFoundError('blogs');
    }

    return blogs.map(({ handle }) => ({
        blog: handle,
    }));
}

export async function generateMetadata({ params }: { params: BlogPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData, blog: blogHandle } = await params;
    if (!isValidHandle(blogHandle)) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const api = await ShopifyApolloApiClient({ shop, locale });

    const [blog, blogError] = await BlogApi({ api, handle: blogHandle });
    if (blogError) {
        if (Error.isNotFound(blogError)) {
            notFound();
        }

        console.error(blogError);
        throw blogError;
    }

    const locales = await LocalesApi({ api });

    const title = blog.seo?.title || blog.title;
    const description = blog.seo?.description || ''; // TODO: Use metafield.
    return {
        title,
        description,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/blogs/${blogHandle}/`,
            languages: locales.reduce(
                (prev, { code }) => ({
                    ...prev,
                    [code]: `https://${shop.domain}/${code}/blogs/${blogHandle}/`,
                }),
                {},
            ),
        },
        openGraph: {
            url: `/blogs/${blogHandle}/`,
            type: 'article',
            title,
            description,
            siteName: shop.name,
            locale: locale.code,
            images: [],
        },
    };
}

export default async function BlogPage({ params }: { params: BlogPageParams }) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData, blog: blogHandle } = await params;
    if (!isValidHandle(blogHandle)) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const api = await ShopifyApolloApiClient({ shop, locale });

    const [blog, blogError] = await BlogApi({ api, handle: blogHandle });
    if (blogError) {
        if (Error.isNotFound(blogError)) {
            notFound();
        }

        console.error(blogError);
        throw blogError;
    }

    const { title, description } = blog;
    const articles = flattenConnection(blog.articles);

    return (
        <>
            <Suspense key={`blog.${blogHandle}.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={title} />
                </div>
            </Suspense>

            <PageContent as="article">
                <Heading
                    title={title}
                    subtitleAs={Fragment}
                    subtitle={
                        description ? (
                            <RichText
                                data={description}
                                className="prose prose-p:leading-snug"
                                components={{ root: ({ node: { children } }) => children }}
                            />
                        ) : null
                    }
                    subtitleClassName="text-gray-500"
                />

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                    {articles.map(({ id, title, excerptHtml, publishedAt, authorV2: author, image, handle }) => {
                        const publishedAtString = new Date(publishedAt).toLocaleDateString(locale as any, {
                            weekday: undefined,
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        });
                        const avatar = author
                            ? `https://www.gravatar.com/avatar/${md5(author.email)}.jpg?s=25&d=blank`
                            : null;

                        return (
                            <Card
                                key={id}
                                className="flex h-full w-full flex-col items-stretch justify-between gap-1 p-2 md:gap-3"
                                border={true}
                            >
                                <Link
                                    href={`/blogs/${blogHandle}/${handle}`}
                                    className="group/header flex flex-col gap-2"
                                >
                                    {image?.url ? (
                                        <Image
                                            className="aspect-[16/7] rounded-lg bg-gray-100 object-cover object-center shadow transition-all group-hover/header:brightness-75 group-focus-visible/header:brightness-75"
                                            role={image.altText ? undefined : 'presentation'}
                                            src={image.url}
                                            alt={image.altText!}
                                            height={image.height!}
                                            width={image.width!}
                                            decoding="async"
                                            loading={'eager'}
                                            priority={true}
                                            draggable={false}
                                            quality={80}
                                        />
                                    ) : (
                                        <div className="aspect-[16/7] rounded-lg bg-gray-100 transition-color group-hover/header:brightness-75 group-focus-visible/header:brightness-75" />
                                    )}

                                    <div className="block font-semibold text-xl transition-colors group-hover/header:text-primary group-focus-visible/header:text-primary">
                                        {title}
                                    </div>
                                </Link>

                                <div className="flex flex-col justify-stretch gap-3 md:gap-4">
                                    <Content
                                        className="not-prose line-clamp-4 overflow-hidden leading-normal"
                                        html={excerptHtml}
                                    />

                                    <div className="flex items-center justify-between gap-2">
                                        {author ? (
                                            <div className="flex items-center justify-end gap-1">
                                                {avatar ? (
                                                    <Avatar
                                                        name={author.name}
                                                        src={avatar}
                                                        className="-mt-1 -mb-1 size-4"
                                                    />
                                                ) : null}

                                                <Label
                                                    as="div"
                                                    className="font-semibold text-gray-500 text-sm normal-case leading-none"
                                                >
                                                    {author.name}
                                                </Label>
                                            </div>
                                        ) : null}

                                        <Label
                                            as="div"
                                            className="font-semibold text-gray-500 text-sm normal-case leading-none"
                                        >
                                            {publishedAtString}
                                        </Label>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </section>
            </PageContent>
        </>
    );
}

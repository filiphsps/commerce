import Markdoc from '@markdoc/markdoc';
import { Heading } from '@nordcom/nordstar';
import gravatar from 'gravatar.js';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';
import { Content } from '@/components/content';
import { components } from '@/markdoc';
import { getServiceUrl } from '@/utils/domains';

import { getArticleContent, getArticlePaths } from './articles';

export type ArticlePageParams = Promise<{
    year: string;
    month: string;
    slug: string;
}>;

export async function generateStaticParams() {
    return await getArticlePaths();
}

export async function generateMetadata({ params }: { params: ArticlePageParams }): Promise<Metadata> {
    const { year, month, slug } = await params;
    const content = await getArticleContent({ year, month, slug });
    if (!content) return { title: 'Article not found' };
    const {
        meta: { title, description },
    } = content;

    const url = `${getServiceUrl()}/news/${year}/${month}/${slug}/`;
    return {
        title,
        description,
        publisher: 'Nordcom AB',
        alternates: {
            canonical: url,
        },
        openGraph: {
            type: 'article',
            title,
            description,
            url,
        },
    };
}

export default async function ArticlePage({ params }: { params: ArticlePageParams }) {
    'use cache';
    cacheLife('max');

    const { year, month, slug } = await params;
    const article = await getArticleContent({ year, month, slug });
    if (!article) notFound();
    const {
        content,
        meta: { title, date, author },
    } = article;

    const avatar = await gravatar.resolve(author.email, {
        protocol: 'https',
        defaultIcon: 'blank',
    });

    return (
        <div>
            <div className="flex w-full max-w-full flex-col overflow-hidden border-[hsl(0_0%_15%)] border-b pb-4">
                <Heading level="h3" as="div">
                    {date.toLocaleDateString('en-US')}
                </Heading>
                <Heading level="h1" className="max-md:!text-[3.25rem] my-4 leading-none md:max-w-[62rem]">
                    {title}
                </Heading>
                <Heading
                    level="h4"
                    as="div"
                    className="relative flex flex-col items-start justify-start gap-1 font-normal text-base normal-case"
                >
                    <span className="mb-[0.5rem] font-semibold text-base uppercase">Written by</span>
                    <div className="relative flex flex-row items-center justify-start gap-2">
                        <div className="block aspect-square w-[2.75em] overflow-hidden rounded-full">
                            <Image
                                src={avatar}
                                alt={author.name}
                                title={author.name}
                                width={35}
                                height={35}
                                className="h-full w-full object-cover object-center"
                            />
                        </div>
                        <Link
                            className="flex flex-col items-start justify-between gap-[0.05em] transition-colors hover:text-brand"
                            href={`https://x.com/${author.handle}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <div className="font-bold text-[1.05em] text-foreground leading-normal">{author.name}</div>
                            <div className="font-semibold text-[0.85em] leading-normal">{author.handle}</div>
                        </Link>
                    </div>
                </Heading>
            </div>

            <Content>{Markdoc.renderers.react(content, React, { components })}</Content>
        </div>
    );
}

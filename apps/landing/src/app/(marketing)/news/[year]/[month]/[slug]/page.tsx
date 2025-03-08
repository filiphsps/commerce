import styles from './page.module.scss';

import React from 'react';

import { Heading } from '@nordcom/nordstar';

import { components } from '@/markdoc';
import Markdoc from '@markdoc/markdoc';
import gravatar from 'gravatar.js';
import Image from 'next/image';
import Link from 'next/link';

import { Content } from '@/components/content';

import { getArticleContent, getArticlePaths } from './articles';

import type { Metadata } from 'next';

export const dynamicParams = false;

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
    const {
        meta: { title, description }
    } = await getArticleContent({ year, month, slug });

    const url = `https://${(process.env.LANDING_DOMAIN as string) || 'shops.nordcom.io'}/news/${year}/${month}/${slug}/`;
    return {
        title,
        description,
        publisher: 'Nordcom AB',
        alternates: {
            canonical: url
        },
        openGraph: {
            type: 'article',
            title,
            description,
            url
        }
    };
}

export default async function ArticlePage({ params }: { params: ArticlePageParams }) {
    const { year, month, slug } = await params;
    const {
        content,
        meta: { title, date, author }
    } = await getArticleContent({ year, month, slug });

    const avatar = await gravatar.resolve(author.email, {
        protocol: 'https',
        defaultIcon: 'blank'
    });

    return (
        <div className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading level="h3" as="div">
                    {date.toLocaleDateString('en-US')}
                </Heading>
                <Heading level="h1">{title}</Heading>
                <Heading level="h4" as="div" className={styles.authors}>
                    <span className={styles.label}>Written by</span>
                    <div className={styles.author}>
                        <div className={styles.avatar}>
                            <Image src={avatar} alt={author.name} title={author.name} width={35} height={35} />
                        </div>
                        <Link
                            className={styles.details}
                            href={`https://x.com/${author.handle}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <div className={styles.name}>{author.name}</div>
                            <div className={styles.handle}>{author.handle}</div>
                        </Link>
                    </div>
                </Heading>
            </div>

            <Content>{Markdoc.renderers.react(content as any, React, { components })}</Content>
        </div>
    );
}

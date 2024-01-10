import { Content } from '@/components/content';
import { components } from '@/markdoc';
import Markdoc from '@markdoc/markdoc';
import { Heading } from '@nordcom/nordstar';
import gravatar from 'gravatar.js';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { getArticleContent, getArticlePaths } from './articles';
import styles from './page.module.scss';

export const dynamicParams = false;

export type ArticlePageParams = {
    year: string;
    month: string;
    slug: string;
};

export async function generateStaticParams() {
    return await getArticlePaths();
}

export async function generateMetadata({
    params: { year, month, slug }
}: {
    params: ArticlePageParams;
}): Promise<Metadata> {
    const {
        meta: { title, description }
    } = await getArticleContent({ year, month, slug });

    const url = `https://shops.nordcom.io/news/${year}/${month}/${slug}/`;
    return {
        title,
        description,
        publisher: 'Nordcom Group Inc.',
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

export default async function ArticlePage({ params: { year, month, slug } }: { params: ArticlePageParams }) {
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

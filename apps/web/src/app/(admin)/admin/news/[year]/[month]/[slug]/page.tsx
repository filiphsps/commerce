import { Content } from '#/components/content';
import { components, config } from '@/utils/markdoc';
import type { Schema } from '@markdoc/markdoc';
import Markdoc from '@markdoc/markdoc';
import { Heading } from '@nordcom/nordstar';
import fs from 'fs';
import { glob } from 'glob';
import gravatar from 'gravatar.js';
import matter from 'gray-matter';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import path from 'path';
import React from 'react';
import styles from './page.module.scss';

const ARTICLES_PATH = 'src/app/(news)';
const POSTS_DIR = path.join(process.cwd(), ARTICLES_PATH);

export const dynamicParams = false;

export type ArticlePageParams = {
    year: string;
    month: string;
    slug: string;
};

export async function generateStaticParams() {
    const postPaths = await glob(path.join(POSTS_DIR, '**/*.md'));
    return postPaths.map((postPath) => {
        const slug = path.basename(postPath, path.extname(postPath));
        const month = path.basename(path.dirname(postPath));
        const year = path.basename(path.dirname(path.dirname(postPath)));

        return {
            year,
            month,
            slug
        };
    });
}

export async function generateMetadata({
    params: { year, month, slug }
}: {
    params: ArticlePageParams;
}): Promise<Metadata> {
    const {
        meta: { title, description }
    } = await getMarkdownContent({ year, month, slug });

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

async function getMarkdownContent({ year, month, slug }: ArticlePageParams) {
    const filePath = path.join(POSTS_DIR, year, month, `${slug}.md`);
    const source = fs.readFileSync(filePath, 'utf-8');
    const matterResult = matter(source);
    const { title, description, date, author, handle } = matterResult.data;
    const content = (Markdoc.transform(Markdoc.parse(source), config) as Schema).children as Schema[];

    return {
        content,
        meta: {
            title,
            description,
            date: date as Date,
            author: {
                // Parse `Name <email>` into { name, email }.
                name: author.split('<')[0].trim() as string,
                email: author.split('<')[1].replace('>', '').trim() as string,
                handle
            }
        }
    };
}

export default async function ArticlePage({ params: { year, month, slug } }: { params: ArticlePageParams }) {
    const {
        content,
        meta: { title, date, author }
    } = await getMarkdownContent({ year, month, slug });

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

import { config } from '@/markdoc';
import Markdoc from '@markdoc/markdoc';
import fs from 'fs';
import { glob } from 'glob';
import matter from 'gray-matter';
import path from 'path';

import type { Schema } from '@markdoc/markdoc';

const ARTICLES_PATH = 'articles/';
const POSTS_DIR = path.join(process.cwd(), ARTICLES_PATH);

export async function getArticlePaths() {
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

export async function getArticleContent({ year, month, slug }: { year: string; month: string; slug: string }) {
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
                name: (author?.split('<')[0]?.trim() as string) || '',
                email: (author?.split('<')[1]?.replace('>', '').trim() as string) || '',
                handle
            }
        }
    };
}

export async function getArticles() {
    const paths = await getArticlePaths();
    const articles = (
        await Promise.all(
            paths.map(async ({ year, month, slug }) => {
                const { meta } = await getArticleContent({ year, month, slug });
                return {
                    year,
                    month,
                    slug,
                    meta
                };
            })
        )
    ).sort((a, b) => {
        if (a.meta.date < b.meta.date) {
            return 1;
        } else if (a.meta.date > b.meta.date) {
            return -1;
        } else {
            return 0;
        }
    });

    return articles;
}

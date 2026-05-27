import fs from 'node:fs';
import path from 'node:path';
import type { Tag } from '@markdoc/markdoc';
import Markdoc from '@markdoc/markdoc';
import { glob } from 'glob';
import matter from 'gray-matter';
import { config } from '@/markdoc';

const ARTICLES_PATH = 'articles/';
const POSTS_DIR = path.join(process.cwd(), ARTICLES_PATH);
const POST_PATHS = glob.sync(path.join(POSTS_DIR, '**/*.md'));

// `year`, `month`, `slug` come from URL segments. `path.join` collapses `..`,
// so without these checks a request like `/news/..%2F..%2Fdocs/errors/X`
// resolves to a `.md` outside POSTS_DIR. Validate shape AND verify the final
// resolved path stays inside POSTS_DIR — defence in depth in case the shape
// guards drift.
const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^\d{1,2}$/;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,254}[a-z0-9])?$/;
const isValidArticleParams = ({ year, month, slug }: { year: string; month: string; slug: string }): boolean =>
    YEAR_RE.test(year) && MONTH_RE.test(month) && SLUG_RE.test(slug);

/**
 * Returns the URL segment params for every Markdown article discovered on disk.
 *
 * @returns Array of `{ year, month, slug }` objects suitable for `generateStaticParams`.
 */
export async function getArticlePaths() {
    return POST_PATHS.map((postPath) => {
        const slug = path.basename(postPath, path.extname(postPath));
        const month = path.basename(path.dirname(postPath));
        const year = path.basename(path.dirname(path.dirname(postPath)));

        return {
            year,
            month,
            slug,
        };
    });
}

/**
 * Reads and parses a single Markdown article identified by its URL segments.
 *
 * Validates param shape and that the resolved file path stays inside the articles directory
 * before any filesystem access, preventing path-traversal via percent-encoded sequences.
 *
 * @param year - Four-digit year string from the URL segment.
 * @param month - One- or two-digit month string from the URL segment.
 * @param slug - Lowercase alphanumeric slug from the URL segment.
 * @returns Parsed Markdoc content tree and front-matter metadata, or `null` when params are invalid or the file is absent.
 */
export async function getArticleContent({ year, month, slug }: { year: string; month: string; slug: string }) {
    if (!isValidArticleParams({ year, month, slug })) return null;
    const filePath = path.resolve(POSTS_DIR, year, month, `${slug}.md`);
    if (!filePath.startsWith(`${POSTS_DIR}${path.sep}`)) {
        // Belt-and-braces: shape regexes already exclude `..` but if a future
        // regex change weakens this, the path-prefix check still holds.
        return null;
    }
    if (!fs.existsSync(filePath)) return null;
    const source = fs.readFileSync(filePath, 'utf-8');
    const matterResult = matter(source);
    const { title, description, date, author, handle } = matterResult.data;
    const content = (Markdoc.transform(Markdoc.parse(source), config) as Tag).children;

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
                handle,
            },
        },
    };
}

/**
 * Loads all articles and returns them sorted newest-first by publication date.
 *
 * @returns Array of article records, each containing URL segment params and front-matter metadata, sorted descending by date.
 */
export async function getArticles() {
    const paths = await getArticlePaths();
    const articles = (
        await Promise.all(
            paths.map(async ({ year, month, slug }) => {
                const content = await getArticleContent({ year, month, slug });
                if (!content) return null;
                return {
                    year,
                    month,
                    slug,
                    meta: content.meta,
                };
            }),
        )
    )
        .filter((a): a is NonNullable<typeof a> => a !== null)
        .sort((a, b) => {
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

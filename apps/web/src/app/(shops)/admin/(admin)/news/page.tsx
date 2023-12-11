import { Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles } from './[year]/[month]/[slug]/articles';
import styles from './page.module.scss';

export const metadata: Metadata = {
    title: 'News'
};

export type NewsPageParams = {};
export default async function DocsPage({ params: {} }: { params: NewsPageParams }) {
    const articles = await getArticles();

    return (
        <article className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading level="h1" title="News">
                    News & Updates
                </Heading>
            </div>

            <article className={styles.content}>
                {articles.map(({ year, month, slug, meta: { title, description, date } }) => (
                    <Card
                        key={`/${year}/${month}/${slug}`}
                        as={Link}
                        href={`/news/${year}/${month}/${slug}`}
                        className={styles.section}
                        draggable={false}
                    >
                        <Heading level="h4" as="h3">
                            {title} {date ? `- ${date.toLocaleDateString('en-US')}` : ''}
                        </Heading>
                        <p>{description}.</p>
                    </Card>
                ))}
            </article>
        </article>
    );
}

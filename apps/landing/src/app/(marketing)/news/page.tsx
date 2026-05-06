import styles from './page.module.scss';

import { Card, Heading } from '@nordcom/nordstar';

import Link from 'next/link';

import { getArticles } from './[year]/[month]/[slug]/articles';

import type { Metadata } from 'next';

type NewsItemProps = {
    data: Awaited<ReturnType<typeof getArticles>>[number];
};
function NewsItem({
    data: {
        year,
        month,
        slug,
        meta: { title, description },
    },
}: NewsItemProps) {
    return (
        <Card
            key={`/${year}/${month}/${slug}`}
            as={Link}
            href={`/news/${year}/${month}/${slug}`}
            className={styles.section}
            draggable={false}
        >
            <Heading level="h4" as="h3" className={styles.heading}>
                {title}
            </Heading>
            <p>{description}.</p>
        </Card>
    );
}

export const metadata: Metadata = {
    title: 'News',
};

export default async function NewsPage() {
    const articles = await getArticles();

    return (
        <article className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading level="h1" title="News">
                    News & Updates
                </Heading>
            </div>

            <article className={styles.content}>
                {articles.map((article) => {
                    const { year, month, slug } = article;

                    return <NewsItem key={`/${year}/${month}/${slug}`} data={article} />;
                })}
            </article>
        </article>
    );
}

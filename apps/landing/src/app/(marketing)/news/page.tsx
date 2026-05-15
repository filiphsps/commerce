import { Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';

import Link from 'next/link';

import { getArticles } from './[year]/[month]/[slug]/articles';

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
            className="flex h-full select-none flex-col items-start justify-start gap-[0.25rem] overflow-hidden transition-colors hover:border-foreground focus:border-foreground"
            draggable={false}
        >
            <Heading level="h4" as="h3" className="text-base text-muted-foreground">
                {title}
            </Heading>
            <p className="hyphens-auto whitespace-pre-wrap text-base text-muted-foreground leading-normal">
                {description}.
            </p>
        </Card>
    );
}

export const metadata: Metadata = {
    title: 'News',
};

export default async function NewsPage() {
    const articles = await getArticles();

    return (
        <article className="flex flex-col">
            <div className="flex w-full max-w-full flex-col gap-[0.5rem] overflow-hidden">
                <Heading level="h1" title="News">
                    News & Updates
                </Heading>
            </div>

            <article className="mt-7 grid auto-rows-[1fr] grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4 overflow-hidden">
                {articles.map((article) => {
                    const { year, month, slug } = article;

                    return <NewsItem key={`/${year}/${month}/${slug}`} data={article} />;
                })}
            </article>
        </article>
    );
}

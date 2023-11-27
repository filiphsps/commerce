import { Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.scss';

export const metadata: Metadata = {
    title: 'News'
};

export type NewsPageParams = {};
export default async function DocsPage({ params: {} }: { params: NewsPageParams }) {
    return (
        <article className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading level="h1" title="News">
                    News & Updates
                </Heading>
            </div>

            <article className={styles.content}>
                <Card as={Link} href={`/news/2023/11/hello-world`} className={styles.section} draggable={false}>
                    <Heading level="h4" as="h3">
                        Hello World
                    </Heading>
                    <p>
                        Just a temporary news post to test the layout. This will be replaced with a real news post once
                        we&apos;re ready to go live.
                    </p>
                </Card>
            </article>
        </article>
    );
}

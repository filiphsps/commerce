import { Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.scss';

export const metadata: Metadata = {
    title: 'Documentation'
};

export type DocsPageParams = {};
export default async function DocsPage({ params: {} }: { params: DocsPageParams }) {
    return (
        <article className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading level="h1" title="Documentation">
                    Docu&shy;mentation
                </Heading>
            </div>

            <article className={styles.content}>
                <Card as={Link} href={`/docs/errors/`} className={styles.section} draggable={false}>
                    <Heading level="h4" as="h3">
                        Error Codes
                    </Heading>
                    <p>A list of all error codes that can be returned by the API and what they mean.</p>
                </Card>
            </article>
        </article>
    );
}

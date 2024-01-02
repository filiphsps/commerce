import { Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import styles from './page.module.scss';

export type IndexUnknownPageParams = {};

export const metadata: Metadata = {
    title: 'Unknown or Invalid Storefront',
    robots: {
        index: false,
        follow: false
    }
};

export default async function IndexUnknownPage({}: { params: IndexUnknownPageParams }) {
    const headersList = headers();

    const originalUrl = headersList.get('x-original-uri');
    if (!originalUrl || originalUrl.startsWith('/errors')) {
        notFound();
    }

    return (
        <section className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading>404</Heading>
                <Heading level="h2">Unknown or invalid storefront</Heading>
            </div>

            <article className={`${styles.content}`}>
                <p>
                    The specific page, resource or storefront you are looking for does not exist or has recently been
                    removed by the author. If you believe this to be an error, please get in thouch with the{' '}
                    <code>Nordcom Group Inc.</code> support via <a href="mailto:hi@nordcom.io">hi@nordcom.io</a>.
                </p>
            </article>
        </section>
    );
}

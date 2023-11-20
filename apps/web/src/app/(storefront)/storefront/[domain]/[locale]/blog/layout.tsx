import { BlogApi } from '@/api/blog';
import { StorefrontApiClient } from '@/api/shopify';
import { Page } from '@/components/layout/page';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import { Label } from '@/components/typography/label';
import { NextLocaleToLocale } from '@/utils/locale';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './layout.module.scss';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
/*export const dynamicParams = true;
export async function generateStaticParams() {
    // FIXME: Don't hardcode these.
    // TODO: Figure out which sites to prioritize pre-rendering on.
    return [
        {
            domain: 'sweetsideofsweden.com',
            locale: 'en-US'
        }
    ];
}*/
/* c8 ignore stop */

/* c8 ignore start */
export type BlogLayoutParams = { domain: string; locale: string };
export default async function BlogLayout({
    children,
    params: { domain, locale: localeData }
}: {
    children: ReactNode;
    params: BlogLayoutParams;
}) {
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();

    const api = StorefrontApiClient({ domain, locale });
    const latest = (await BlogApi({ api, handle: 'news', limit: 5 })).articles.edges.map(
        ({ node: article }) => article
    );
    const popular = (await BlogApi({ api, handle: 'news', limit: 5, sorting: 'RELEVANCE' })).articles.edges.map(
        ({ node: article }) => article
    );

    return (
        <Page>
            <PageContent primary>
                <div className={styles.container}>
                    <main className={styles.content}>{children}</main>

                    <div className={styles['sidebar-wrapper']}>
                        <aside className={styles.sidebar}>
                            <section className={styles.section}>
                                <Label>Latest Articles</Label>
                                {latest.map(({ id, handle, title }) => (
                                    <Link key={id} href={`/blog/${handle}/`}>
                                        {title}
                                    </Link>
                                ))}
                            </section>
                            <section className={styles.section}>
                                <Label>Popular Posts</Label>
                                {popular.map(({ id, handle, title }) => (
                                    <Link key={id} href={`/blog/${handle}/`}>
                                        {title}
                                    </Link>
                                ))}
                            </section>
                        </aside>
                    </div>
                </div>
            </PageContent>
        </Page>
    );
}
/* c8 ignore stop */

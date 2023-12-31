import { ShopApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import { Label } from '@/components/typography/label';
import { Error } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './layout.module.scss';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
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
    try {
        const shop = await ShopApi(domain);
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const api = await ShopifyApolloApiClient({ shop, locale });
        const latest = (await BlogApi({ api, handle: 'news', limit: 5 })).articles.edges.map(
            ({ node: article }) => article
        );
        const popular = (await BlogApi({ api, handle: 'news', limit: 5, sorting: 'RELEVANCE' })).articles.edges.map(
            ({ node: article }) => article
        );

        return (
            <PageContent primary={true}>
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
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
/* c8 ignore stop */

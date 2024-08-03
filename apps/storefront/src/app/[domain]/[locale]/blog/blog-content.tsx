import styles from './blog-content.module.scss';

import type { OnlineShop } from '@nordcom/commerce-db';

import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { Content } from '@/components/typography/content';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { Blog } from '@shopify/hydrogen-react/storefront-api-types';

type BlogContentProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    blog: Blog;
};
export default async function BlogContent({ shop, locale, blog }: BlogContentProps) {
    return (
        <div className={styles.articles}>
            {blog.articles.edges.map(({ node: article }) => {
                const href = `/blog/${article.handle}/`;

                return (
                    <article key={article.id} className={styles.article}>
                        <header className={styles.header}>
                            <div className={styles.date}>
                                {new Date(article.publishedAt).toLocaleDateString(locale as any, {
                                    weekday: undefined,
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>

                            <div className={styles.author}>{article.authorV2?.name}</div>
                        </header>

                        <div className={styles.title}>
                            <Link key={article.id} href={href} shop={shop} locale={locale}>
                                {article.title}
                            </Link>
                        </div>

                        <Content
                            className={styles.excerpt}
                            dangerouslySetInnerHTML={{ __html: article.excerptHtml || '' }}
                        />

                        <section className={styles.actions}>
                            <Button className={styles.action} as={Link} href={href} locale={locale}>
                                Read more
                            </Button>
                        </section>
                    </article>
                );
            })}
        </div>
    );
}

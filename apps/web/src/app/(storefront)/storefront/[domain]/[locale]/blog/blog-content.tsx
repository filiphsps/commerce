import Content from '@/components/Content';
import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { Blog } from '@shopify/hydrogen-react/storefront-api-types';
import gravatar from 'gravatar.js';
import Image from 'next/image';
import styles from './blog-content.module.scss';

type BlogContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    blog: Blog;
    store: StoreModel;
};
export default async function BlogContent({ locale, blog, store }: BlogContentProps) {
    return (
        <>
            <div className={styles.articles}>
                {await Promise.all(
                    blog.articles.edges.map(async ({ node: article }) => {
                        const href = `/blog/${article.handle}/`;

                        const authorAvatar =
                            (article.authorV2?.email &&
                                (await gravatar.resolve(article.authorV2.email, {
                                    protocol: 'https',
                                    defaultIcon: 'blank'
                                }))) ||
                            undefined;

                        return (
                            <article key={article.id} className={styles.article}>
                                <div className={styles.date}>
                                    {new Date(article.publishedAt).toLocaleDateString(locale as any, {
                                        weekday: undefined,
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                                <div className={styles.title}>
                                    <Link key={article.id} href={href} locale={locale}>
                                        {article.title}
                                    </Link>
                                </div>
                                <div className={styles.excerpt}>
                                    <Content dangerouslySetInnerHTML={{ __html: article.excerptHtml || '' }} />
                                </div>

                                <div className={styles.authors}>
                                    {authorAvatar ? (
                                        <div className={styles.author} title={`Written by ${article.authorV2?.name}`}>
                                            <Image src={authorAvatar} alt={''} width={40} height={40} />
                                        </div>
                                    ) : null}
                                </div>

                                <section className={styles.actions}>
                                    <Button className={styles.action} as={Link} href={href} locale={locale}>
                                        Read more
                                    </Button>
                                </section>
                            </article>
                        );
                    })
                )}
            </div>
        </>
    );
}

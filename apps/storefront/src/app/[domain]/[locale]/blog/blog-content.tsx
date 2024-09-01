import 'server-only';

import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';

import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { Content } from '@/components/typography/content';

import type { Blog } from '@shopify/hydrogen-react/storefront-api-types';

type BlogContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    blog: Blog;
};
export default async function BlogContent({ locale, i18n, blog }: BlogContentProps) {
    const { t } = useTranslation('common', i18n);

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {blog.articles.edges.map(({ node: article }) => {
                const href = `/blog/${article.handle}/`;

                const publishedAt = new Date(article.publishedAt).toLocaleDateString(locale.code, {
                    weekday: undefined,
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                const initials = article.authorV2?.name
                    .split(' ')
                    .map((name) => name.slice(0, 1))
                    .join('');

                return (
                    <article
                        key={article.id}
                        className="flex flex-col gap-2 rounded-lg border-2 border-solid border-gray-300 p-2 md:p-3"
                    >
                        <header className="flex w-full items-center justify-between leading-none">
                            <div
                                className="text-sm font-semibold leading-none text-gray-600"
                                suppressHydrationWarning={true}
                            >
                                {publishedAt}
                            </div>

                            <div className="flex items-center justify-end">
                                <div
                                    className="flex size-7 select-none items-center justify-center whitespace-nowrap rounded-full bg-gray-200 text-xs font-semibold leading-none"
                                    title={article.authorV2?.name}
                                >
                                    {initials}
                                </div>
                            </div>
                        </header>

                        <Link
                            key={article.id}
                            href={href}
                            locale={locale}
                            className="hover:text-primary block w-full text-pretty text-xl font-semibold"
                        >
                            {article.title}
                        </Link>

                        <Content className="grow" html={article.excerptHtml} />

                        <Button className="py-3 capitalize leading-tight" as={Link} href={href} locale={locale}>
                            {t('continue-reading')}
                        </Button>
                    </article>
                );
            })}
        </div>
    );
}

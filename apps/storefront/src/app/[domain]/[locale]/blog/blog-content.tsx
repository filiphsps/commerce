import 'server-only';

import { capitalize, type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';

import { Button } from '@/components/actionable/button';
import { Card } from '@/components/layout/card';
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3">
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
                    <Card key={article.id} as="article" className="flex flex-col gap-2" border={true}>
                        {article.image?.url ? (
                            <div
                                role="presentation"
                                className="bg-gray h-24 w-full rounded-lg bg-cover bg-center bg-no-repeat object-cover object-center"
                                style={{ backgroundImage: `url('${article.image.url}')` }}
                            />
                        ) : null}

                        <header className="flex h-4 w-full items-start justify-between overflow-visible leading-none">
                            <div
                                className="text-sm font-semibold leading-none text-gray-500"
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
                            className="hover:text-primary block w-full text-pretty pr-7 text-xl font-semibold"
                        >
                            {article.title}
                        </Link>

                        <Content className="grow" html={article.excerptHtml} />

                        <Button className="py-3 capitalize leading-tight" as={Link} href={href} locale={locale}>
                            {capitalize(t('continue-reading'))}
                        </Button>
                    </Card>
                );
            })}
        </div>
    );
}

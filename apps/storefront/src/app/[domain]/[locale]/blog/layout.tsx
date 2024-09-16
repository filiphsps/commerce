import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { notFound } from 'next/navigation';

import Link from '@/components/link';
import { Label } from '@/components/typography/label';

import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const dynamicParams = true;
export const revalidate = 86_400; // 24 hours.

export type BlogLayoutParams = { domain: string; locale: string };
export default async function BlogLayout({
    children,
    params: { domain, locale: localeData }
}: {
    children: ReactNode;
    params: BlogLayoutParams;
}) {
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const api = await ShopifyApolloApiClient({ shop, locale });

    const [latest, latestError] = await BlogApi({ api, handle: 'news' });
    if (latestError) {
        if (Error.isNotFound(latestError)) {
            notFound();
        }

        console.error(latestError);
        throw latestError;
    }

    const [popular, popularError] = await BlogApi({ api, handle: 'news' });
    if (popularError) {
        if (Error.isNotFound(popularError)) {
            notFound();
        }

        console.error(popularError);
        throw popularError;
    }

    return (
        <div className="flex h-full w-full flex-col gap-3 md:grid md:grid-cols-[1fr_auto] md:gap-6">
            {children}

            <aside className={cn('mt-4 flex h-min flex-col gap-3 md:sticky md:top-32 md:w-72 md:gap-6')}>
                <section className="flex flex-col gap-2">
                    <Label as="div" className="text-base leading-none">
                        Latest Articles
                    </Label>
                    {latest.articles.edges
                        .map(({ node: article }) => article)
                        .map(({ id, handle, title }) => (
                            <Link
                                key={id}
                                href={`/blog/${handle}/`}
                                className="hover:text-primary block text-sm font-medium text-gray-600"
                            >
                                {title}
                            </Link>
                        ))}
                </section>

                <section className="flex flex-col gap-2">
                    <Label as="div" className="text-base leading-none">
                        Popular Posts
                    </Label>
                    {popular.articles.edges
                        .map(({ node: article }) => article)
                        .map(({ id, handle, title }) => (
                            <Link
                                key={id}
                                href={`/blog/${handle}/`}
                                className="hover:text-primary block text-sm font-medium text-gray-600"
                            >
                                {title}
                            </Link>
                        ))}
                </section>
            </aside>
        </div>
    );
}

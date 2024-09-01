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

export const revalidate = 28800; // 8 hours.

export type BlogLayoutParams = { domain: string; locale: string };
export default async function BlogLayout({
    children,
    params: { domain, locale: localeData }
}: {
    children: ReactNode;
    params: BlogLayoutParams;
}) {
    try {
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        const locale = Locale.from(localeData);

        const api = await ShopifyApolloApiClient({ shop, locale });
        const latest = (await BlogApi({ api, handle: 'news', limit: 5 })).articles.edges.map(
            ({ node: article }) => article
        );
        const popular = (await BlogApi({ api, handle: 'news', limit: 5, sorting: 'RELEVANCE' })).articles.edges.map(
            ({ node: article }) => article
        );

        return (
            <div className="flex h-full w-full flex-col gap-3 md:grid md:grid-cols-[1fr_auto] md:gap-6">
                {children}

                <aside className={cn('mt-4 flex h-min flex-col gap-3 md:sticky md:top-32 md:mt-0 md:w-72 md:gap-6')}>
                    <section className="flex flex-col gap-2">
                        <Label as="div" className="text-lg">
                            Latest Articles
                        </Label>
                        {latest.map(({ id, handle, title }) => (
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
                        <Label as="div" className="text-lg">
                            Popular Posts
                        </Label>
                        {popular.map(({ id, handle, title }) => (
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
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

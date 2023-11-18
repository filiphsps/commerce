import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../../not-found';

/* c8 ignore start */

export type ArticlePageParams = { domain: string; locale: string; handle: string };

export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ArticlePageParams;
}): Promise<Metadata> {
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    try {
        const store = await StoreApi({ locale, api: StorefrontApiClient({ domain, locale }) });
        const locales = store.i18n.locales;
    
        const title = 'TODO';
        const description = 'TODO';
        return {
            title,
            description,
            alternates: {
                canonical: `https://${domain}/${locale.locale}/blog/${handle}/`,
                languages: locales.reduce(
                    (prev, { locale }) => ({
                        ...prev,
                        [locale]: `https://${domain}/${locale}/blog/${handle}/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/${locale.locale}/blog/${handle}/`,
                type: 'website',
                title,
                description,
                siteName: store?.name,
                locale: locale.locale,
                images: []
            }
        };
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export default async function ArticlePage({ params: { domain, locale: localeData, handle } }: { params: ArticlePageParams }) {
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();

    try {
        const api = StorefrontApiClient({ domain, locale });
        const store = await StoreApi({ locale, api });

        return (
            <Page>
                <PageContent primary>
                </PageContent>
            </Page>
        );
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFound();
        }

        throw error;
    }
}

export const revalidate = 120;
/* c8 ignore stop */

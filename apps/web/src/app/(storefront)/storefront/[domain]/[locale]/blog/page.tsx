import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { StoreApi } from '@/api/store';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../not-found';
import BlogContent from './blog-content';

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
export type BlogPageParams = { domain: string; locale: string };

export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: BlogPageParams;
}): Promise<Metadata> {
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    const store = await StoreApi({ domain, locale, api: StorefrontApiClient({ domain, locale }) });
    const { page } = await PageApi({ locale, handle: 'blog', type: 'custom_page' });
    const locales = store.i18n.locales;

    const title = page?.meta_title || page?.title || 'Blog'; // TODO: Fallback should respect i18n.
    const description: string | undefined =
        (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${domain}/${locale.locale}/blog/`,
            languages: locales.reduce(
                (prev, { locale }) => ({
                    ...prev,
                    [locale]: `https://${domain}/${locale}/blog/`
                }),
                {}
            )
        },
        openGraph: {
            url: `/blog/`,
            type: 'website',
            title,
            description,
            siteName: store?.name,
            locale: locale.locale,
            images:
                (page?.meta_image && [
                    {
                        url: page?.meta_image!.url as string,
                        width: page?.meta_image!.dimensions?.width || 0,
                        height: page?.meta_image!.dimensions?.height || 0,
                        alt: page?.meta_image!.alt || '',
                        secureUrl: page?.meta_image!.url as string
                    }
                ]) ||
                undefined
        }
    };
}

export default async function BlogPage({ params: { domain, locale: localeData } }: { params: BlogPageParams }) {
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();

    const i18n = await getDictionary(locale);
    const api = StorefrontApiClient({ domain, locale });
    const store = await StoreApi({ domain, locale, api });
    const { page } = await PageApi({ locale, handle: 'blog', type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ api, page }))) || null;
    const blog = await BlogApi({ api, handle: 'news' });

    return (
        <>
            <Heading title={page?.title} subtitle={page?.description} />

            <BlogContent blog={blog} store={store} locale={locale} i18n={i18n} />

            {page?.slices && page?.slices.length > 0 && (
                <PrismicPage
                    store={store}
                    locale={locale}
                    page={page}
                    prefetch={prefetch}
                    i18n={i18n}
                    handle={'blog'}
                    type={'custom_page'}
                />
            )}
        </>
    );
}
/* c8 ignore stop */

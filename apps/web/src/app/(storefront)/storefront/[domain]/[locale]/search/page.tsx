import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../not-found';
import SearchContent from './search-content';

export type SearchPageParams = { domain: string; locale: string };

export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: SearchPageParams;
}): Promise<Metadata> {
    const handle = 'search';
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    const api = StorefrontApiClient({ domain, locale });
    const store = await StoreApi({ domain, locale, api });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const locales = store.i18n.locales;

    const title = page?.meta_title || page?.title || 'Search'; // TODO: Fallback should respect i18n.
    const description = (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${domain}/${locale.locale}/${handle}/`,
            languages: locales.reduce(
                (prev, { locale }) => ({
                    ...prev,
                    [locale]: `https://${domain}/${locale}/${handle}/`
                }),
                {}
            )
        },
        openGraph: {
            url: `/${locale.locale}/${handle}/`,
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

export default async function SearchPage({ params: { domain, locale: localeData } }: { params: SearchPageParams }) {
    const handle = 'search';
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);

    const api = StorefrontApiClient({ domain, locale });
    const store = await StoreApi({ domain, locale, api });

    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ api, page }))) || null;

    return (
        <Page>
            <PageContent primary>
                <Heading title={page?.title} subtitle={page?.description} />

                {page?.slices && page?.slices.length > 0 && (
                    <PrismicPage
                        store={store}
                        locale={locale}
                        page={page}
                        prefetch={prefetch}
                        i18n={i18n}
                        handle={handle}
                        type={'custom_page'}
                    />
                )}

                <SearchContent store={store} locale={locale} />
            </PageContent>
        </Page>
    );
}

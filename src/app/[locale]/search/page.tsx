import { Config } from '@/utils/Config';
import { NextLocaleToLocale } from '@/utils/Locale';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { Prefetch } from '@/utils/Prefetch';
import SearchContent from './search-content';
import { SliceZone } from '@prismicio/react';
import { StoreApi } from '@/api/store';
import { Suspense } from 'react';
import { asText } from '@prismicio/client';
import { createClient } from '@/prismic';
import { components as slices } from '@/slices';

export async function generateMetadata({ params }: { params: { locale: string } }) {
    const { locale: localeData } = params;
    const handle = 'search';
    const locale = NextLocaleToLocale(localeData);
    const locales = Config.i18n.locales;

    const store = await StoreApi({ locale: locale.locale });
    const client = createClient({});
    let page: any = null;
    try {
        page = await client.getByUID('custom_page', handle, {
            lang: locale.locale
        });
    } catch {
        try {
            page = await client.getByUID('custom_page', handle);
        } catch {}
    }

    return {
        title: page?.data?.meta_title || page?.data.title!,
        description:
            (page?.data?.meta_description && asText(page?.data.meta_description)) || page?.data?.description! || '',
        alternates: {
            canonical: `https://${Config.domain}/search/`,
            languages: locales.reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr]: `https://${Config.domain}/${curr}/search/`
                }),
                {}
            )
        },
        openGraph: {
            url: `https://${Config.domain}${locale.locale}/search/`,
            type: 'website',
            title: page?.data.meta_title || page?.data.title!,
            description:
                (page?.data.meta_description && asText(page.data.meta_description)) || page?.data.description || '',
            siteName: store?.name,
            locale: locale.locale,
            images:
                (page?.data?.meta_image && [
                    {
                        url: page?.data?.meta_image!.url as string,
                        width: page?.data?.meta_image!.dimensions?.width || 0,
                        height: page?.data?.meta_image!.dimensions?.height || 0,
                        alt: page?.data?.meta_image!.alt || '',
                        secureUrl: page?.data?.meta_image!.url as string
                    }
                ]) ||
                undefined
        }
    };
}

export async function generateStaticParams() {
    return Config.i18n.locales.map((locale) => ({ locale: locale }));
}

export type SearchPageParams = { locale: string };
export default async function SearchPage({ params }: { params: SearchPageParams }) {
    const { locale: localeData } = params;
    const handle = 'search';
    const locale = NextLocaleToLocale(localeData);

    const store = await StoreApi({ locale: locale.locale });

    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch(page, locale.locale))) || null;

    return (
        <Page>
            <PageContent primary>
                <PageHeader title={page?.title} subtitle={page?.description} />

                <SliceZone slices={page?.slices} components={slices} context={{ store, prefetch }} />

                <Suspense>
                    <SearchContent store={store} />
                </Suspense>
            </PageContent>
        </Page>
    );
}

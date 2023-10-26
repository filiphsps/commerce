import { BuildConfig } from '@/utils/build-config';
import { NextLocaleToLocale } from '@/utils/locale';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { Prefetch } from '@/utils/Prefetch';
import PrismicPage from '@/components/prismic-page';
import SearchContent from './search-content';
import { StoreApi } from '@/api/store';
import { StorefrontApiClient } from '@/api/shopify';
import { Suspense } from 'react';
import { asText } from '@prismicio/client';
import { getDictionary } from '@/i18n/dictionarie';

export async function generateMetadata({ params }: { params: { locale: string } }) {
    const { locale: localeData } = params;
    const handle = 'search';
    const locale = NextLocaleToLocale(localeData);
    const locales = BuildConfig.i18n.locales;

    const store = await StoreApi({ locale, shopify: StorefrontApiClient({ locale }) });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });

    return {
        title: page?.meta_title || page?.title || 'Search', // FIXME: i18n fallback
        description: (page?.meta_description && asText(page?.meta_description)) || page?.description! || '',
        alternates: {
            canonical: `https://${BuildConfig.domain}/search/`,
            languages: locales.reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr]: `https://${BuildConfig.domain}/${curr}/search/`
                }),
                {}
            )
        },
        openGraph: {
            url: `https://${BuildConfig.domain}${locale.locale}/search/`,
            type: 'website',
            title: page?.meta_title || page?.title!,
            description: (page?.meta_description && asText(page.meta_description)) || page?.description || '',
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

export async function generateStaticParams() {
    return BuildConfig.i18n.locales.map((locale) => ({ locale }));
}

export type SearchPageParams = { locale: string };
export default async function SearchPage({ params }: { params: SearchPageParams }) {
    const { locale: localeData } = params;
    const handle = 'search';
    const locale = NextLocaleToLocale(localeData);
    const i18n = await getDictionary(locale);

    const client = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, shopify: client });

    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ client, page }))) || null;

    return (
        <Page>
            <PageContent primary>
                <PageHeader title={page?.title} subtitle={page?.description} />

                <Suspense>
                    <Suspense>
                        {page && (
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
                    </Suspense>

                    <SearchContent store={store} />
                </Suspense>
            </PageContent>
        </Page>
    );
}

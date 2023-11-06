import { CountriesApi, StoreApi } from '@/api/store';

import { BuildConfig } from '@/utils/build-config';
import Heading from '@/components/typography/heading';
import LocaleSelector from './locale-selector';
import { NextLocaleToLocale } from '@/utils/locale';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import PageContent from '@/components/PageContent';
import { Prefetch } from '@/utils/prefetch';
import PrismicPage from '@/components/prismic-page';
import { StorefrontApiClient } from '@/api/shopify';
import { Suspense } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { notFound } from 'next/navigation';

export type CountriesPageParams = { locale: string };

export async function generateStaticParams() {
    return BuildConfig.i18n.locales.map((locale) => ({ locale }));
}
export default async function CountriesPage({ params }: { params: CountriesPageParams }) {
    const { locale: localeData } = params;
    const handle = 'countries';
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);

    const client = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, shopify: client });
    const countries = await CountriesApi({ client });

    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ client, page }))) || null;

    return (
        <Page>
            <PageContent primary>
                <PageContent>
                    <Heading title={page?.title} subtitle={page?.description} />
                    <LocaleSelector countries={countries} store={store} locale={locale} />
                </PageContent>

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
            </PageContent>
        </Page>
    );
}

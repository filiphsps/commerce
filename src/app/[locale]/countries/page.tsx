import { CountriesApi, StoreApi } from '@/api/store';

import { PageApi } from '@/api/page';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { getDictionary } from '@/i18n/dictionarie';
import { components as slices } from '@/slices';
import { Prefetch } from '@/utils/Prefetch';
import { Config } from '@/utils/config';
import { NextLocaleToLocale } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';
import { Suspense } from 'react';
import LocaleSelector from './locale-selector';

export type CountriesPageParams = { locale: string };

export async function generateStaticParams() {
    return Config.i18n.locales.map((locale) => ({ locale: locale }));
}
export default async function CountriesPage({ params }: { params: CountriesPageParams }) {
    const { locale: localeData } = params;
    const handle = 'countries';
    const locale = NextLocaleToLocale(localeData);
    const i18n = await getDictionary(locale);

    const store = await StoreApi({ locale });
    const countries = await CountriesApi({ locale: locale.locale });

    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch(page, locale.locale))) || null;

    return (
        <Page>
            <PageContent primary>
                <PageContent>
                    <PageHeader title={page?.title} subtitle={page?.description} />
                    <LocaleSelector countries={countries} store={store} />
                </PageContent>

                <Suspense>
                    <SliceZone slices={page?.slices} components={slices} context={{ store, prefetch, i18n }} />
                </Suspense>
            </PageContent>
        </Page>
    );
}

import { CountriesApi, StoreApi } from '@/api/store';

import { Config } from '@/utils/Config';
import LocaleSelector from './locale-selector';
import { NextLocaleToLocale } from '@/utils/Locale';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { Prefetch } from '@/utils/Prefetch';
import { SliceZone } from '@prismicio/react';
import { components as slices } from '@/slices';

export type CountriesPageParams = { locale: string };

export async function generateStaticParams() {
    return Config.i18n.locales.map((locale) => ({ locale: locale }));
}
export default async function CountriesPage({ params }: { params: CountriesPageParams }) {
    const { locale: localeData } = params;
    const handle = 'countries';
    const locale = NextLocaleToLocale(localeData);

    const store = await StoreApi({ locale: locale.locale });
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

                <SliceZone slices={page?.slices} components={slices} context={{ store, prefetch }} />
            </PageContent>
        </Page>
    );
}

import { CountriesApi, StoreApi } from '@/api/store';

import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { notFound } from 'next/navigation';
import LocaleSelector from './locale-selector';

export type CountriesPageParams = { locale: string };

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
            </PageContent>
        </Page>
    );
}

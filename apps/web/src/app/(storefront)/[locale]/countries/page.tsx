import { CountriesApi, StoreApi } from '@/api/store';

import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { BuildConfig } from '@/utils/build-config';
import { NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { RedirectType, notFound, redirect } from 'next/navigation';
import { getDictionary } from 'src/app/(storefront)/[locale]/dictionary';
import { metadata as notFoundMetadata } from '../not-found';
import LocaleSelector from './locale-selector';

export type CountriesPageParams = { locale: string };
export async function generateMetadata({ params }: { params: CountriesPageParams }): Promise<Metadata> {
    const { locale: localeData } = params;
    const handle = 'countries';
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    const store = await StoreApi({ locale, api: StorefrontApiClient({ locale }) });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const locales = store.i18n.locales;

    const description: string | undefined =
        (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
    return {
        title: page?.meta_title || page?.title || 'Countries', // TODO: Fallback should respect i18n.
        description,
        alternates: {
            canonical: `https://${BuildConfig.domain}/${locale.locale}/countries/`,
            languages: locales.reduce(
                (prev, { locale }) => ({
                    ...prev,
                    [locale]: `https://${BuildConfig.domain}/${locale}/countries/`
                }),
                {}
            )
        },
        openGraph: {
            url: `/${locale.locale}/countries/`,
            type: 'website',
            title: page?.meta_title || page?.title!,
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

export default async function CountriesPage({ params }: { params: CountriesPageParams }) {
    const { locale: localeData } = params;
    const handle = 'countries';
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);

    const api = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, api });
    const countries = await CountriesApi({ api });

    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ client: api, page }))) || null;

    return (
        <Page>
            <PageContent primary>
                <PageContent>
                    <Heading title={page?.title} subtitle={page?.description} />
                    <form
                        action={async (formData: FormData) => {
                            'use server';

                            const locale = formData.get('locale') as string | null;

                            // Make sure we got a locale.
                            if (!locale) return { message: 'No locale provided.' };

                            // Validate the locale.
                            if (!NextLocaleToLocale(locale)) return { message: 'Invalid locale provided.' };

                            cookies().set('LOCALE', locale);
                            return redirect(`/${locale}/countries/`, RedirectType.replace);
                        }}
                    >
                        <LocaleSelector countries={countries} store={store} locale={locale} />
                    </form>
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

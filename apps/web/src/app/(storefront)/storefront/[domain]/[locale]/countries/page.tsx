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
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { RedirectType, notFound, redirect } from 'next/navigation';
import { metadata as notFoundMetadata } from '../not-found';
import LocaleSelector from './locale-selector';

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
export type CountriesPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: CountriesPageParams;
}): Promise<Metadata> {
    const handle = 'countries';
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    const store = await StoreApi({ domain, locale, api: StorefrontApiClient({ domain, locale }) });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const locales = store.i18n.locales;

    const description: string | undefined =
        (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
    return {
        title: page?.meta_title || page?.title || 'Countries', // TODO: Fallback should respect i18n.
        description,
        alternates: {
            canonical: `https://${domain}/${locale.locale}/countries/`,
            languages: locales.reduce(
                (prev, { locale }) => ({
                    ...prev,
                    [locale]: `https://${domain}/${locale}/countries/`
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
/* c8 ignore stop */

export default async function CountriesPage({
    params: { domain, locale: localeData }
}: {
    params: CountriesPageParams;
}) {
    const handle = 'countries';
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);

    const api = StorefrontApiClient({ domain, locale });
    const store = await StoreApi({ domain, locale, api });
    const countries = await CountriesApi({ api });

    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ api, page }))) || null;

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

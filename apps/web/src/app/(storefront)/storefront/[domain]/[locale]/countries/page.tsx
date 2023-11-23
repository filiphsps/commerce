import { CountriesApi, LocalesApi, StoreApi } from '@/api/store';

import { PageApi } from '@/api/page';
import { ShopApi, ShopsApi } from '@/api/shop';
import { StorefrontApiClient } from '@/api/shopify';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { DefaultLocale, NextLocaleToLocale, useTranslation } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { RedirectType, notFound, redirect } from 'next/navigation';
import { metadata as notFoundMetadata } from '../not-found';
import LocaleSelector from './locale-selector';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
export async function generateStaticParams() {
    const locale = DefaultLocale()!;
    const shops = await ShopsApi();

    return (
        await Promise.all(
            shops.map(async (shop) => {
                const api = await StorefrontApiClient({ shop, locale });
                const locales = await LocalesApi({ api });

                return locales.map(({ locale }) => ({
                    domain: shop.domains.primary,
                    locale: locale
                }));
            })
        )
    ).flat(2);
}
/* c8 ignore stop */

/* c8 ignore start */
export type CountriesPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: CountriesPageParams;
}): Promise<Metadata> {
    const shop = await ShopApi({ domain });
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    const api = await StorefrontApiClient({ shop, locale });
    const store = await StoreApi({ api });
    const { page } = await PageApi({ shop, locale, handle: 'countries', type: 'custom_page' });
    const locales = store.i18n.locales;
    const i18n = await getDictionary(locale);
    const { t } = useTranslation('common', i18n);

    const title = page?.meta_title || page?.title || t('countries');
    const description: string | undefined =
        (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${domain}/${locale.code}/countries/`,
            languages: locales.reduce(
                (prev, { locale }) => ({
                    ...prev,
                    [locale]: `https://${domain}/${locale}/countries/`
                }),
                {}
            )
        },
        openGraph: {
            url: `/countries/`,
            type: 'website',
            title,
            description,
            siteName: store?.name,
            locale: locale.code,
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
    const shop = await ShopApi({ domain });
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);

    const api = await StorefrontApiClient({ shop, locale });
    const store = await StoreApi({ api });
    const countries = await CountriesApi({ api });

    const { page } = await PageApi({ shop, locale, handle: 'countries', type: 'custom_page' });
    const prefetch = await Prefetch({ api, page });

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
                        <LocaleSelector shop={shop} countries={countries} store={store} locale={locale} />
                    </form>
                </PageContent>

                {page?.slices && page?.slices.length > 0 && (
                    <PrismicPage
                        shop={shop}
                        store={store}
                        locale={locale}
                        page={page}
                        prefetch={prefetch}
                        i18n={i18n}
                        handle={'countries'}
                        type={'custom_page'}
                    />
                )}
            </PageContent>
        </Page>
    );
}

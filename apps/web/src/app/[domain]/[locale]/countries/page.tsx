/* eslint-disable react-hooks/rules-of-hooks */

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CountriesApi, LocalesApi } from '@/api/store';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { Locale, useTranslation } from '@/utils/locale';
import { ShopApi } from '@nordcom/commerce-database';
import { Error, UnknownLocaleError } from '@nordcom/commerce-errors';
import { asText } from '@prismicio/client';
import { unstable_cache as cache } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import LocaleSelector from './locale-selector';

import type { Metadata } from 'next';

export type CountriesPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: CountriesPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const { page } = await PageApi({ shop, locale, handle: 'countries', type: 'custom_page' });
        const locales = await LocalesApi({ api });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        const title = page?.meta_title || page?.title || t('countries');
        const description: string | undefined =
            (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}/countries/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/countries/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/countries/`,
                type: 'website',
                title,
                description,
                siteName: shop?.name,
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
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

export default async function CountriesPage({
    params: { domain, locale: localeData }
}: {
    params: CountriesPageParams;
}) {
    try {
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const countries = await CountriesApi({ api });
        const { page } = await PageApi({ shop, locale, handle: 'countries', type: 'custom_page' });

        const i18n = await getDictionary(locale);

        return (
            <PageContent primary={true}>
                <PageContent>
                    <Heading title={page?.title} subtitle={page?.description} />
                    <form
                        action={async (formData: FormData) => {
                            'use server';
                            const locale = formData.get('locale') as string | null;

                            // Make sure we got a locale.
                            if (!locale) {
                                // See https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#error-handling.
                                throw new UnknownLocaleError();
                            }

                            // Validate the locale.
                            try {
                                const { code } = Locale.from(locale);
                                cookies().set('LOCALE', code);
                            } catch (error: unknown) {
                                throw error; // TODO: Proper nordcom error.
                            }

                            // Needs to happen outside of the try and catch block.
                            // See https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#redirecting.
                            redirect(`/${locale}/`);
                        }}
                    >
                        <LocaleSelector shop={shop} countries={countries} locale={locale} />
                    </form>
                </PageContent>

                {page?.slices && page?.slices.length > 0 && (
                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        page={page}
                        i18n={i18n}
                        handle={'countries'}
                        type={'custom_page'}
                    />
                )}
            </PageContent>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

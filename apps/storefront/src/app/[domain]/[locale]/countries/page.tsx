import { Shop } from '@nordcom/commerce-db';
import { Error, UnknownLocaleError } from '@nordcom/commerce-errors';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PageApi } from '@/api/prismic/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CountriesApi, LocalesApi } from '@/api/store';
import PrismicPage from '@/components/cms/prismic-page';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import LocaleSelector from './locale-selector';

export type CountriesPageParams = Promise<{ domain: string; locale: string }>;
export async function generateMetadata({ params }: { params: CountriesPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    // Safely try to fetch page.
    // TODO: Do this better, for instance by returning [result, error] fron api routes.
    const page = await (async () => {
        try {
            return await PageApi({ shop, locale, handle: 'countries' });
        } catch (error: unknown) {
            if (Error.isNotFound(error)) {
                return null;
            }
            throw error;
        }
    })();
    const locales = await LocalesApi({ api });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    const title = page?.meta_title || page?.title || capitalize(t('countries'));
    const description: string | undefined =
        (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/countries/`,
            languages: Object.fromEntries(
                locales.map(({ code }) => [code, `https://${shop.domain}/${code}/countries/`]),
            ),
        },
        openGraph: {
            url: `/countries/`,
            type: 'website',
            title,
            description,
            siteName: shop.name,
            locale: locale.code,
            images: page?.meta_image
                ? [
                      {
                          url: page.meta_image!.url as string,
                          width: page.meta_image!.dimensions?.width || 0,
                          height: page.meta_image!.dimensions?.height || 0,
                          alt: page.meta_image!.alt || '',
                          secureUrl: page.meta_image!.url as string,
                      },
                  ]
                : undefined,
        },
    };
}

export default async function CountriesPage({ params }: { params: CountriesPageParams }) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const api = await ShopifyApolloApiClient({ shop, locale });

    const countries = await CountriesApi({ api });

    // Safely try to fetch page.
    // TODO: Do this better, for instance by returning [result, error] fron api routes.
    const page = await (async () => {
        try {
            return await PageApi({ shop, locale, handle: 'countries' });
        } catch (error: unknown) {
            if (Error.isNotFound(error)) {
                return null;
            }
            throw error;
        }
    })();

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    return (
        <>
            <PageContent>
                <Heading title={page?.title || capitalize(t('countries'))} subtitle={page?.description} />

                <form
                    action={async (formData: FormData) => {
                        'use server';
                        const locale = formData.get('locale') as string | null;

                        // Make sure we got a locale.
                        if (!locale) {
                            // See https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#error-handling.
                            throw new UnknownLocaleError();
                        }
                        const { code } = Locale.from(locale);
                        (await cookies()).set('localization', code);
                        (await cookies()).set('NEXT_LOCALE', code);

                        // Needs to happen outside of the try and catch block.
                        // See https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#redirecting.
                        redirect(`/${locale}/`, RedirectType.push);
                    }}
                    suppressHydrationWarning={true}
                >
                    <Suspense>
                        <LocaleSelector countries={countries} locale={locale} />
                    </Suspense>
                </form>
            </PageContent>

            {page?.slices && page.slices.length > 0 ? (
                <PrismicPage shop={shop} locale={locale} page={page} handle={'countries'} type={'custom_page'} />
            ) : null}
        </>
    );
}

import { Shop } from '@nordcom/commerce-db';
import { UnknownLocaleError } from '@nordcom/commerce-errors';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CountriesApi, LocalesApi } from '@/api/store';
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

    const locales = await LocalesApi({ api });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    const title = capitalize(t('countries'));
    return {
        title,
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
            siteName: shop.name,
            locale: locale.code,
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

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    return (
        <PageContent>
            <Heading title={capitalize(t('countries'))} />

            <form
                action={async (formData: FormData) => {
                    'use server';
                    const locale = formData.get('locale') as string | null;

                    if (!locale) {
                        throw new UnknownLocaleError();
                    }
                    const { code } = Locale.from(locale);

                    // Validate the candidate against the shop's actual locale
                    // list. `Locale.from` only checks the format — without the
                    // membership check, a user could poison their cookie with
                    // a locale this shop doesn't support and every subsequent
                    // page hits a 404/redirect loop. Re-fetch instead of
                    // closing over a render-time list so a deploy that adds a
                    // new locale takes effect without a page-cache bust.
                    const actionShop = await Shop.findByDomain(domain, { sensitiveData: true });
                    const actionApi = await ShopifyApolloApiClient({ shop: actionShop, locale });
                    const supported = (await LocalesApi({ api: actionApi })).map((l) => l.code);
                    if (!supported.includes(code)) {
                        throw new UnknownLocaleError(`Locale ${code} is not supported by ${actionShop.domain}`);
                    }

                    const cookieStore = await cookies();
                    cookieStore.set('localization', code);
                    cookieStore.set('NEXT_LOCALE', code);

                    redirect(`/${code}/`, RedirectType.push);
                }}
                suppressHydrationWarning={true}
            >
                <Suspense>
                    <LocaleSelector countries={countries} locale={locale} />
                </Suspense>
            </form>
        </PageContent>
    );
}

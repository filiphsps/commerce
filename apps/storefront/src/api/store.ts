import { gql } from '@apollo/client';
import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, NoLocalesAvailableError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import type { Country, Localization, PaymentSettings } from '@shopify/hydrogen-react/storefront-api-types';
import { unstable_cache } from 'next/cache';
import type { BusinessDataDocument, BusinessDataDocumentData, Simplify } from '@/prismic/types';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { buildPrismicCacheTags, createClient } from '@/utils/prismic';

// FIXME: Handle tenant-specific default.
const DEFAULT_LOCALE = {
    availableLanguages: [{ isoCode: 'EN', name: 'English' }],
    isoCode: 'US',
    name: 'United States',
};

export const CountriesApi = async ({ api }: { api: AbstractApi }): Promise<Country[]> => {
    const { data: localData, errors } = await api.query<{ localization: Localization }>(gql`
        query localization {
            localization {
                availableCountries {
                    availableLanguages {
                        isoCode
                        name
                    }
                    currency {
                        isoCode
                        name
                        symbol
                    }
                    isoCode
                    name
                }
            }
        }
    `);

    if (errors) {
        console.error(errors);
        return [];
    }

    // FIXME: Handle errors or missing data.
    return (
        ((localData?.localization.availableCountries ?? [DEFAULT_LOCALE]) as Country[])
            // https://nordcom.sentry.io/share/issue/b0b9721ad1e54a88b779605737472230/
            // `availableLanguages` shouldn't be nullable, but it sometimes is.
            .map((data) => ({ ...data, availableLanguages: data.availableLanguages || [] }))
    );
};

export const LocalesApi = async ({ api }: { api: AbstractApi }): Promise<Locale[]> => {
    const countries = await CountriesApi({ api });

    const locales = countries.flatMap((country) =>
        country.availableLanguages.map((language) => {
            try {
                return Locale.from({ language: language.isoCode, country: country.isoCode });
            } catch {
                return Locale.default;
            }
        }),
    ) as Locale[] | undefined;

    if (!locales || locales.length <= 0) {
        throw new NoLocalesAvailableError();
    }

    return locales;
};

export const LocaleApi = async ({ api }: { api: AbstractApi }) => {
    const shop = api.shop();
    if ((shop.commerceProvider.type as string) !== 'shopify') {
        // TODO: Do this properly.
        return null;
    }

    try {
        const { data } = await api.query<{ localization: Localization }>(gql`
            query localization {
                localization {
                    country {
                        currency {
                            isoCode
                            name
                            symbol
                        }
                        isoCode
                        name
                        unitSystem
                    }
                    language {
                        isoCode
                        name
                    }
                    market {
                        id
                        handle
                    }
                }
            }
        `);

        return data?.localization;
    } catch (error: unknown) {
        throw new ProviderFetchError(error instanceof Error ? error.message : String(error));
    }
};

export const ShopPaymentSettingsApi = async ({
    api,
}: {
    api: AbstractApi;
}): Promise<Pick<
    PaymentSettings,
    'acceptedCardBrands' | 'enabledPresentmentCurrencies' | 'supportedDigitalWallets'
> | null> => {
    const shop = api.shop();
    if ((shop.commerceProvider.type as string) !== 'shopify') {
        // TODO: Do this properly.
        return null;
    }

    const { data, errors } = await api.query<{ shop: { paymentSettings: PaymentSettings } }>(gql`
        query shop {
            shop {
                paymentSettings {
                    acceptedCardBrands
                    enabledPresentmentCurrencies
                    supportedDigitalWallets
                }
            }
        }
    `);

    // TODO: Handle errors properly.
    if ((errors || []).length > 0) {
        console.error(errors);
        return null;
    }

    if (!data?.shop) {
        return null;
    }

    return data.shop.paymentSettings;
};

export const BusinessDataApi = async ({
    shop,
    locale,
}: {
    shop: OnlineShop;
    locale: Locale;
}): Promise<Simplify<BusinessDataDocumentData>> => {
    const client = createClient({ shop, locale });

    return unstable_cache(
        async () => {
            try {
                const res = await client.getSingle<BusinessDataDocument>('business_data');
                return res.data;
            } catch (error: unknown) {
                const _locale = client.defaultParams?.lang ? Locale.from(client.defaultParams.lang) : locale; // Actually used locale.
                if (Error.isNotFound(error)) {
                    const fallback = Locale.fallbackForShop(shop);
                    if (fallback.code !== _locale.code) {
                        return await BusinessDataApi({ shop, locale: fallback as Locale }); // Try again with fallback locale.
                    }

                    throw new NotFoundError(`"BusinessData" with the locale "${locale.code}"`);
                }

                throw error;
            }
        },
        [shop.domain, locale.code, 'business_data'],
        {
            revalidate: 86_400, // 24hrs.
            tags: buildPrismicCacheTags({ shop, locale, doc: { type: 'business_data', uid: 'business_data' } }),
        },
    )();
};

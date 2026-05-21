import 'server-only';

import { gql } from '@apollo/client';
import { getBusinessData } from '@nordcom/commerce-cms/api';
import type { BusinessDatum } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import { NoLocalesAvailableError, ProviderFetchError } from '@nordcom/commerce-errors';
import type { Country, Localization, PaymentSettings } from '@shopify/hydrogen-react/storefront-api-types';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';

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
        const { data, errors } = await api.query<{ localization: Localization }>(gql`
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

        // Same partial-error trap as the other API helpers — without
        // surfacing `errors` a Shopify failure collapses to `null
        // localization`, which downstream treats as "shop without locale
        // info" and then renders the wrong currency/language without
        // warning.
        if (errors && errors.length > 0) {
            throw new ProviderFetchError(errors as never);
        }

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

export type BusinessDataApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the Payload `BusinessData` global for this tenant + locale. Returns
 * `null` when the doc has not been seeded — InfoBar / Footer call sites
 * collapse to no-render in that case.
 */
export const BusinessDataApi = async ({ shop, locale }: BusinessDataApiArgs): Promise<BusinessDatum | null> => {
    return getBusinessData({
        shop: toShopRef(shop),
        locale: { code: locale.code },
    });
};

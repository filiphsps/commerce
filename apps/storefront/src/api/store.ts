import 'server-only';

import { getBusinessData } from '@nordcom/commerce-cms/api';
import type { BusinessDatum } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import { NoLocalesAvailableError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { trace } from '@opentelemetry/api';
import type { Country, PaymentSettings } from '@shopify/hydrogen-react/storefront-api-types';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { runCmsDualRead } from './_cms-shadow';
import { normalizePayloadDoc } from './_normalize-payload';

const COUNTRIES_QUERY = graphql(`
    query countries {
        localization {
            availableCountries {
                availableLanguages {
                    isoCode
                    endonymName
                    name
                }
                currency {
                    isoCode
                    name
                    symbol
                }
                isoCode
                name
                unitSystem
            }
        }
    }
`);

const LOCALIZATION_QUERY = graphql(`
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
                endonymName
                name
            }
        }
    }
`);

const PAYMENT_SETTINGS_QUERY = graphql(`
    query paymentSettings {
        shop {
            paymentSettings {
                acceptedCardBrands
                enabledPresentmentCurrencies
                supportedDigitalWallets
            }
        }
    }
`);

// FIXME: Handle tenant-specific default.
const DEFAULT_LOCALE = {
    availableLanguages: [{ isoCode: 'EN', name: 'English' }],
    isoCode: 'US',
    name: 'United States',
};

/**
 * Fetches available countries and their languages from the Shopify Storefront API.
 *
 * @param options - Storefront API client wrapper for the query.
 * @param options.api - Storefront API client.
 * @returns Array of available countries; falls back to a US default when the API returns nothing.
 */
export const CountriesApi = async ({ api }: { api: AbstractApi }): Promise<Country[]> => {
    const { data: localData, errors } = await api.query(COUNTRIES_QUERY);

    if (errors) {
        trace.getActiveSpan()?.addEvent('store.countries_query_errors', {
            'error.message': String(errors),
        });
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

/**
 * Derives all supported locales for the shop from the available countries.
 *
 * @param options - Storefront API client wrapper for the query.
 * @param options.api - Storefront API client.
 * @returns Array of supported locales.
 * @throws {NoLocalesAvailableError} When no locales can be derived from the available countries.
 */
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

/**
 * Fetches the current localization context (country and language) from the Shopify Storefront API.
 *
 * @param options - Storefront API client wrapper for the query.
 * @param options.api - Storefront API client.
 * @returns Localization object, or `null` when the shop does not use Shopify as its commerce provider.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 */
export const LocaleApi = async ({ api }: { api: AbstractApi }) => {
    const shop = api.shop();
    if ((shop.commerceProvider.type as string) !== 'shopify') {
        // TODO: Do this properly.
        return null;
    }

    try {
        const { data, errors } = await api.query(LOCALIZATION_QUERY);

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

/**
 * Fetches payment settings for the shop from the Shopify Storefront API.
 *
 * @param options - Storefront API client wrapper for the query.
 * @param options.api - Storefront API client.
 * @returns Payment settings subset, or `null` when the shop does not use Shopify or the query returns no data.
 */
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

    const { data, errors } = await api.query(PAYMENT_SETTINGS_QUERY);

    // TODO: Handle errors properly.
    if ((errors || []).length > 0) {
        trace.getActiveSpan()?.addEvent('store.payment_settings_query_errors', {
            'error.message': String(errors),
        });
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
 * collapse to no-render in that case. Routed through the SFREAD-12 dual-read
 * loader (`CMS_READ_SHADOW` shadow, `CMS_READ_FLIP=businessData`); InfoBarApi
 * delegates here, so this single wrap covers both surfaces without
 * double-shadowing.
 *
 * @param options - Tenant shop record and locale used to scope the Payload CMS fetch.
 * @param options.shop - Shop record identifying the tenant.
 * @param options.locale - Locale used for payload normalization.
 * @returns Normalized business data, or `null` when the doc has not been seeded.
 */
export const BusinessDataApi = async ({ shop, locale }: BusinessDataApiArgs): Promise<BusinessDatum | null> => {
    return runCmsDualRead<BusinessDatum | null>({
        getter: 'businessData',
        shopId: shop.id,
        locale: locale.code,
        mongo: async () => {
            const data = await getBusinessData({
                shop: toShopRef(shop),
                locale: { code: locale.code },
            });
            return data ? normalizePayloadDoc(data, locale.code) : null;
        },
        convex: (query) =>
            query('cms/read:singleton', { shopId: shop.id, collection: 'businessData', locale: locale.code }),
    });
};

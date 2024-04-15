import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { Error, NoLocalesAvailableError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { asText } from '@prismicio/client';
import { gql } from 'graphql-tag';

import type { StoreModel } from '@/models/StoreModel';
import type { StoreDocument } from '@/prismic/types';
import type { AbstractApi } from '@/utils/abstract-api';
import type { Client as PrismicClient } from '@prismicio/client';
import type { Country, Localization, Shop as ShopifyStore } from '@shopify/hydrogen-react/storefront-api-types';

export const CountriesApi = async ({ api }: { api: AbstractApi }): Promise<Country[]> => {
    const { data: localData } = await api.query<{ localization: Localization }>(gql`
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

    // FIXME: Handle errors or missing data.
    return localData?.localization.availableCountries! || [];
};

export const LocalesApi = async ({ api, noCache }: { api: AbstractApi; noCache?: boolean }): Promise<Locale[]> => {
    const shop = api.shop();
    if (shop.commerceProvider.type !== 'shopify') {
        // TODO: Do this properly.
        return [Locale.default];
    }

    const callback = async (api: AbstractApi) => {
        const countries = await CountriesApi({ api });
        const locales = countries.flatMap((country) =>
            country.availableLanguages
                .map((language) => {
                    try {
                        return Locale.from({ language: language.isoCode, country: country.isoCode });
                    } catch {
                        return Locale.default;
                    }
                })
                .filter((_) => _)
        ) as Locale[];

        if (!locales || locales.length <= 0) {
            throw new NoLocalesAvailableError();
        }

        return locales;
    };

    if (noCache) {
        return callback(api);
    }

    return cache(callback, [shop.id, 'locales'], {
        tags: [shop.id, 'locales'],
        revalidate: 28_800 // 8hrs.
    })(api);
};

export const LocaleApi = async ({ api }: { api: AbstractApi }) => {
    const shop = api.shop();
    const locale = api.locale();

    if (shop.commerceProvider.type !== 'shopify') {
        // TODO: Do this properly.
        return null;
    }

    return cache(
        async (api: AbstractApi) => {
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

            return data?.localization!;
        },
        [shop.id, locale.code, 'locale'],
        {
            tags: [shop.id, locale.code, 'locale'],
            revalidate: 28_800 // 8hrs.
        }
    )(api);
};

/**
 * Get store details.
 *
 * @todo deprecate - This functionality will be moved into the {@link ShopApi} in the future.
 */
export const StoreApi = async ({
    locale: _locale,
    client: _client,
    api
}: {
    locale?: Locale;
    client?: PrismicClient;
    api: AbstractApi;
}): Promise<StoreModel> => {
    const shop = api.shop();
    const locale = _locale || api.locale();

    return cache(
        async (api: AbstractApi, locale: Locale, _client?: PrismicClient) => {
            try {
                const { data: shopData } = await api.query<{ shop: ShopifyStore }>(gql`
                    query store {
                        shop {
                            id
                            brand {
                                logo {
                                    image {
                                        url
                                    }
                                }

                                squareLogo {
                                    image {
                                        url
                                    }
                                }

                                colors {
                                    primary {
                                        background
                                        foreground
                                    }
                                    secondary {
                                        background
                                        foreground
                                    }
                                }
                            }

                            paymentSettings {
                                acceptedCardBrands
                                enabledPresentmentCurrencies
                                supportedDigitalWallets
                            }
                        }
                    }
                `);

                let store: any | null = null;
                if (shop.contentProvider.type === 'prismic') {
                    const client = _client || createClient({ shop, locale });
                    store = (await (async () => {
                        try {
                            return await client.getSingle('store', {
                                lang: locale.code,
                                fetchOptions: {
                                    cache: undefined,
                                    next: {
                                        revalidate: 28_800, // 8hrs.
                                        tags: ['prismic']
                                    }
                                },
                                fetchLinks: []
                            });
                        } catch {
                            return await client.getSingle('store', {
                                fetchOptions: {
                                    cache: undefined,
                                    next: {
                                        revalidate: 28_800, // 8hrs.
                                        tags: ['prismic']
                                    }
                                },
                                fetchLinks: []
                            });
                        }
                    })()) as StoreDocument;
                }

                const extraStoreDetails = shopData?.shop;
                const currencies: string[] = store?.currencies?.map((item: any) => item.currency) || []; // TODO: Get these through an API call.

                let locales;
                try {
                    locales = await LocalesApi({ api });
                } catch (error: unknown) {
                    console.error(error);

                    try {
                        notFound();
                    } catch {
                        locales = [Locale.default];
                    }
                }

                return {
                    id: extraStoreDetails?.id || '',
                    name: store?.store_name || extraStoreDetails?.name || '', // FIXME: Throw error instead of empty string.
                    description:
                        (store?.description && asText(store?.description)) ||
                        extraStoreDetails?.description ||
                        undefined,
                    i18n: {
                        locales
                    },
                    logos: {
                        primary: (() => {
                            const logo = {
                                src:
                                    extraStoreDetails?.brand?.logo?.image?.url ||
                                    store?.logos_primary?.url ||
                                    store?.logo ||
                                    undefined,
                                alt:
                                    extraStoreDetails?.brand?.logo?.image?.altText ||
                                    store?.logos_primary?.alt ||
                                    undefined,
                                height:
                                    extraStoreDetails?.brand?.logo?.image?.height ||
                                    store?.logos_primary?.dimensions?.height ||
                                    undefined,
                                width:
                                    extraStoreDetails?.brand?.logo?.image?.width ||
                                    store?.logos_primary?.dimensions?.width ||
                                    undefined
                            };

                            return logo.src ? logo : undefined;
                        })(),
                        alternative: (() => {
                            const logo = {
                                src: store?.logos_alternative?.url || undefined,
                                alt: store?.logos_alternative?.alt || undefined,
                                height: store?.logos_alternative?.dimensions?.height || undefined,
                                width: store?.logos_alternative?.dimensions?.height || undefined
                            };

                            return logo.src ? logo : undefined;
                        })()
                    },
                    favicon: (() => {
                        const logo = {
                            src:
                                extraStoreDetails?.brand?.squareLogo?.image?.url ||
                                store?.logos_favicon?.url ||
                                store?.favicon ||
                                undefined,
                            alt: store?.logos_alternative?.alt || undefined,
                            height: store?.logos_alternative?.dimensions?.height || undefined,
                            width: store?.logos_alternative?.dimensions?.height || undefined
                        };

                        return logo.src ? logo : undefined;
                    })(),
                    accent: {
                        primary:
                            extraStoreDetails?.brand?.colors.primary[0]?.background ||
                            store?.colors_primary ||
                            store?.primary ||
                            '', // FIXME: Throw error instead of empty string.
                        secondary:
                            extraStoreDetails?.brand?.colors.secondary[0]?.background ||
                            store?.colors_secondary ||
                            store?.secondary ||
                            '' // FIXME: Throw error instead of empty string.
                    },
                    color: {
                        primary: extraStoreDetails?.brand?.colors.primary[0]?.foreground || '', // FIXME: Throw error instead of empty string.?
                        secondary: extraStoreDetails?.brand?.colors.secondary[0]?.foreground || '' // FIXME: Throw error instead of empty string.
                    },
                    currencies: extraStoreDetails?.paymentSettings.enabledPresentmentCurrencies || currencies,
                    social: (store?.social as any) || [],
                    payment: {
                        methods: extraStoreDetails?.paymentSettings.acceptedCardBrands || [],
                        wallets: extraStoreDetails?.paymentSettings.supportedDigitalWallets || []
                    }
                };
            } catch (error: unknown) {
                if (Error.isNotFound(error) && !Locale.isDefault(locale)) {
                    return await StoreApi({
                        locale: Locale.default,
                        client: _client,
                        api
                    });
                }

                throw error;
            }
        },
        [shop.id, locale.code, 'store']
    )(api, locale, _client);
};

export const CurrentLocaleApi = async ({ api }: { api: AbstractApi }) => {
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
            }
        }
    `);

    // FIXME: Handle errors or missing data.
    return data?.localization.country;
};

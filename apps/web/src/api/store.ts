import type { Shop } from '@/api/shop';
import type { StoreModel } from '@/models/StoreModel';
import type { StoreDocument } from '@/prismic/types';
import type { AbstractApi } from '@/utils/abstract-api';
import { Error, NoLocalesAvailableError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { asText, type Client as PrismicClient } from '@prismicio/client';
import type { Country, Localization, Shop as ShopifyStore } from '@shopify/hydrogen-react/storefront-api-types';
import { gql } from 'graphql-tag';

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
    return localData?.localization?.availableCountries! || [];
};

export const LocalesApi = async ({ api }: { api: AbstractApi }): Promise<Locale[]> => {
    const shop = api.shop();
    if (shop && shop?.configuration?.commerce?.type === 'dummy') {
        return [Locale.from('en-US')];
    }

    const countries = await CountriesApi({ api });
    const locales = countries.flatMap((country) =>
        country.availableLanguages
            .map((language) => {
                try {
                    return Locale.from({ language: language.isoCode, country: country.isoCode });
                } catch {
                    return null;
                }
            })
            .filter((_) => _)
    ) as Locale[];

    if (!locales || locales.length <= 0) {
        throw new NoLocalesAvailableError();
    }

    return locales;
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
    const client = _client || createClient({ shop, locale });

    if (shop && shop?.configuration?.commerce?.type === 'dummy') {
        return _mockShopApi(shop);
    }

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

        const { data: store }: StoreDocument = await (async () => {
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
        })();

        const extraStoreDetails = shopData?.shop;
        const currencies: string[] = store.currencies?.map((item: any) => item.currency) || [];

        return {
            id: extraStoreDetails?.id || '',
            name: store.store_name || extraStoreDetails?.name || '', // FIXME: Throw error instead of empty string.
            description:
                (store.description && asText(store.description)) || extraStoreDetails?.description || undefined,
            i18n: {
                locales: await LocalesApi({ api })
            },
            logos: {
                primary: (() => {
                    const logo = {
                        src:
                            store.logos_primary?.url ||
                            store.logo ||
                            extraStoreDetails?.brand?.logo?.image?.url ||
                            undefined,
                        alt: store.logos_primary?.alt || extraStoreDetails?.brand?.logo?.image?.altText || undefined,
                        height:
                            store.logos_primary?.dimensions?.height ||
                            extraStoreDetails?.brand?.logo?.image?.height ||
                            undefined,
                        width:
                            store.logos_primary?.dimensions?.width ||
                            extraStoreDetails?.brand?.logo?.image?.width ||
                            undefined
                    };

                    return logo.src ? logo : undefined;
                })(),
                alternative: (() => {
                    const logo = {
                        src: store.logos_alternative?.url || undefined,
                        alt: store.logos_alternative?.alt || undefined,
                        height: store.logos_alternative?.dimensions?.height || undefined,
                        width: store.logos_alternative?.dimensions?.height || undefined
                    };

                    return logo.src ? logo : undefined;
                })()
            },
            favicon: (() => {
                const logo = {
                    src:
                        store.logos_favicon?.url ||
                        store.favicon ||
                        extraStoreDetails?.brand?.squareLogo?.image?.url ||
                        undefined,
                    alt: store.logos_alternative?.alt || undefined,
                    height: store.logos_alternative?.dimensions?.height || undefined,
                    width: store.logos_alternative?.dimensions?.height || undefined
                };

                return logo.src ? logo : undefined;
            })(),
            accent: {
                primary:
                    store.colors_primary ||
                    store.primary ||
                    extraStoreDetails?.brand?.colors.primary?.[0]?.background ||
                    '', // FIXME: Throw error instead of empty string.
                secondary:
                    store.colors_secondary ||
                    store.secondary ||
                    extraStoreDetails?.brand?.colors.secondary?.[0]?.background ||
                    '' // FIXME: Throw error instead of empty string.
            },
            color: {
                primary: extraStoreDetails?.brand?.colors.primary?.[0]?.foreground || '', // FIXME: Throw error instead of empty string.
                secondary: extraStoreDetails?.brand?.colors.secondary?.[0]?.foreground || '' // FIXME: Throw error instead of empty string.
            },
            currencies: extraStoreDetails?.paymentSettings?.enabledPresentmentCurrencies || currencies,
            social: (store.social as any) || [],
            payment: {
                methods: extraStoreDetails?.paymentSettings?.acceptedCardBrands || [],
                wallets: extraStoreDetails?.paymentSettings?.supportedDigitalWallets || []
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error) && !Locale.isDefault(locale)) {
            return await StoreApi({
                locale: Locale.default,
                client,
                api
            });
        }

        throw error;
    }
};

export const _mockShopApi = ({ id }: Shop): StoreModel => ({
    id,
    name: 'Demo Store',
    description: 'This is a demo store for Nordcom Commerce.',
    accent: {
        primary: '#ed1e79',
        secondary: '#ed1e79'
    },
    color: {
        primary: '#fefefe',
        secondary: '#fefefe'
    },

    logos: {
        primary: {
            src: 'https://nordcom.io/logo-light.svg'
        }
    },

    i18n: {
        locales: [Locale.from('en-US')]
    },

    social: []
});

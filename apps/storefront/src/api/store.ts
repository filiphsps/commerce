import { Error, NoLocalesAvailableError, UnknownApiError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { gql } from '@apollo/client';
import { asText } from '@prismicio/client';
import { notFound } from 'next/navigation';

import type { StoreModel } from '@/models/StoreModel';
import type { StoreDocument } from '@/prismic/types';
import type { AbstractApi } from '@/utils/abstract-api';
import type { Client as PrismicClient } from '@prismicio/client';
import type {
    Country,
    Localization,
    PaymentSettings,
    Shop as ShopifyStore
} from '@shopify/hydrogen-react/storefront-api-types';

export const CountriesApi = async ({ api }: { api: AbstractApi }): Promise<Country[]> => {
    const { data: localData } = await api.query<Localization>(gql`
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
    // FIXME: Handle tenant-specific default.
    return (
        (
            ((localData as any)?.localization.availableCountries! || [
                {
                    availableLanguages: [{ isoCode: 'EN', name: 'English' }],
                    isoCode: 'US',
                    name: 'United States'
                }
            ]) as Country[]
        )
            // https://nordcom.sentry.io/share/issue/b0b9721ad1e54a88b779605737472230/
            // `availableLanguages` shouldn't be nullable, but it sometimes is.
            .map((data) => ({ ...data, availableLanguages: data.availableLanguages || [] })) // eslint-disable-line @typescript-eslint/no-unnecessary-condition
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
        })
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

        return data?.localization!;
    } catch (error: unknown) {
        throw new UnknownApiError((error as any)?.message);
    }
};

/**
 * Get store details.
 * @deprecated - Use {@link ShopApi} instead, an alternative for payment methods and currencies will be added in the future.
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
                                revalidate: 28800, // 8 hours.
                                tags: [shop.id, 'prismic']
                            }
                        },
                        fetchLinks: []
                    });
                } catch {
                    return await client.getSingle('store', {
                        fetchOptions: {
                            cache: undefined,
                            next: {
                                revalidate: 28800, // 8 hours.
                                tags: [shop.id, 'prismic']
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
            description: asText(store?.description) || extraStoreDetails?.description || undefined,
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
                        alt: extraStoreDetails?.brand?.logo?.image?.altText || store?.logos_primary?.alt || undefined,
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
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
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

export const ShopPaymentSettingsApi = async ({ api }: { api: AbstractApi }): Promise<PaymentSettings | null> => {
    const { data } = await api.query<{ paymentSettings: PaymentSettings }>(gql`
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

    // FIXME: Handle errors or missing data.
    return data?.paymentSettings || null;
};

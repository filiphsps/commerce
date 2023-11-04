import type { StoreModel } from '@/models/StoreModel';
import { createClient } from '@/prismic';
import type { AbstractApi } from '@/utils/abstract-api';
import { BuildConfig } from '@/utils/build-config';
import { DefaultLocale, type Locale } from '@/utils/locale';
import type { Client as PrismicClient } from '@prismicio/client';
import type { Country, Localization, Shop } from '@shopify/hydrogen-react/storefront-api-types';
import { gql } from 'graphql-tag';

export const CountriesApi = async ({ client }: { client: AbstractApi }): Promise<Country[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data: localData } = await client.query<{ localization: Localization }>(gql`
                query localization($language: LanguageCode!, $country: CountryCode!)
                @inContext(language: $language, country: $country) {
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
            return resolve(localData?.localization?.availableCountries!);
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

export const LocalesApi = async ({ client }: { client: AbstractApi }): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const countries = await CountriesApi({ client });
            const locales = countries.flatMap((country) =>
                country.availableLanguages.map(
                    (language) => `${language.isoCode.toLowerCase()}-${country.isoCode.toUpperCase()}`
                )
            );

            return resolve(locales);
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

export const StoreApi = async ({
    locale,
    client: _client,
    shopify // TODO: Separate this from prismic.
}: {
    locale: Locale;
    client?: PrismicClient;
    shopify: AbstractApi;
}): Promise<StoreModel> => {
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ locale });

        try {
            const { data: shopData } = await shopify.query<{ shop: Shop }>(
                gql`
                    query store($language: LanguageCode!, $country: CountryCode!)
                    @inContext(language: $language, country: $country) {
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
                `,
                {
                    language: locale.language,
                    country: locale.country
                }
            );

            let res: Record<string, any>;

            try {
                res = (
                    await client.getSingle('store', {
                        lang: locale.locale
                    })
                ).data;
            } catch {
                res = (await client.getSingle('store')).data;
            }

            const currencies: string[] = res.currencies?.map((item: any) => item.currency) || [];
            return resolve({
                id: shopData?.shop?.id || '',
                name: res.store_name,
                logo: {
                    src: shopData?.shop?.brand?.logo?.image?.url || res.logo
                },
                favicon: {
                    src: shopData?.shop?.brand?.squareLogo?.image?.url || res.favicon || res.logo
                },
                accent: {
                    primary: shopData?.shop?.brand?.colors.primary?.[0]?.background || res.primary,
                    secondary: shopData?.shop?.brand?.colors.secondary?.[0]?.background || res.secondary
                },
                color: {
                    primary: shopData?.shop?.brand?.colors.primary?.[0]?.foreground || res.primary_text_color,
                    secondary: shopData?.shop?.brand?.colors.secondary?.[0]?.foreground || res.primary_text_color
                },
                currencies: shopData?.shop?.paymentSettings?.enabledPresentmentCurrencies || currencies,
                social: res.social,
                payment: {
                    methods: shopData?.shop?.paymentSettings?.acceptedCardBrands || [],
                    wallets: shopData?.shop?.paymentSettings?.supportedDigitalWallets || []
                }
            });
        } catch (error: any) {
            if (error.message.includes('No documents') && locale.locale !== BuildConfig.i18n.default) {
                console.warn(error);
                return resolve(
                    await StoreApi({
                        locale: DefaultLocale(),
                        client: _client,
                        shopify
                    })
                ); // Try again with default locale
            }

            console.error(error);
            return reject(error);
        }
    });
};

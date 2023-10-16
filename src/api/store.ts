import { NextLocaleToCountry, NextLocaleToLanguage } from 'src/util/Locale';

import { Config } from 'src/util/Config';
import type { Country } from '@shopify/hydrogen-react/storefront-api-types';
import type { StoreModel } from '../models/StoreModel';
import { createClient } from '../../prismicio';
import { gql } from '@apollo/client';
import { storefrontClient } from './shopify';

export const CountriesApi = async ({ locale }: { locale?: string }): Promise<Country[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!locale || locale === 'x-default') locale = Config.i18n.default;

            const country = NextLocaleToCountry(locale);
            const language = NextLocaleToLanguage(locale);

            const { data: localData } = await storefrontClient.query({
                query: gql`
                    query localization @inContext(language: ${language}, country: ${country}) {
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
                `
            });

            return resolve(localData?.localization?.availableCountries);
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

export const LocalesApi = async (): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const countries = await CountriesApi({});
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

export const StoreApi = async ({ locale }): Promise<StoreModel> => {
    return new Promise(async (resolve, reject) => {
        const client = createClient({});

        try {
            if (!locale || locale === 'x-default') locale = Config.i18n.default;

            const country = NextLocaleToCountry(locale);
            const language = NextLocaleToLanguage(locale);

            const { data: shopData } = await storefrontClient.query({
                query: gql`
                    query shop @inContext(language: ${language}, country: ${country}) {
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
                `
            });

            let res: Record<string, any>;

            try {
                res = (
                    await client.getSingle('store', {
                        lang: locale
                    })
                ).data;
            } catch {
                res = (await client.getSingle('store')).data;
            }

            const currencies = res.currencies.map((item) => item.currency);
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
        } catch (error) {
            console.error(error);
            if (error.message.includes('No documents') && locale !== Config.i18n.default) {
                return resolve(await StoreApi({ locale })); // Try again with default locale
            }

            console.error(error);
            return reject(error);
        }
    });
};

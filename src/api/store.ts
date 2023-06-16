import * as Sentry from '@sentry/nextjs';

import { CountryCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';

import { Config } from '../util/Config';
import { StoreModel } from '../models/StoreModel';
import { gql } from '@apollo/client';
import { prismic } from './prismic';
import { storefrontClient } from './shopify';

export const LocalesApi = async ({ locale }): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (locale === '__default')
                locale = Config.i18n.locales[0];

            const country = (
                locale?.split('-')[1] || Config.i18n.locales[0].split('-')[1]
            ).toUpperCase() as CountryCode;
            const language = (
                locale?.split('-')[0] || Config.i18n.locales[0].split('-')[0]
            ).toUpperCase() as LanguageCode;

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

            return localData?.localization?.availableCountries?.map(({ isoCode: country, availableLanguages }) => availableLanguages.map(({isoCode: language}) => `${language.toLowerCase()}-${country.toUpperCase()}`))?.flat() || [];
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

export const StoreApi = async ({ locale }): Promise<StoreModel> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (locale === '__default')
                locale = Config.i18n.locales[0];

            const country = (
                locale?.split('-')[1] || Config.i18n.locales[0].split('-')[1]
            ).toUpperCase() as CountryCode;
            const language = (
                locale?.split('-')[0] || Config.i18n.locales[0].split('-')[0]
            ).toUpperCase() as LanguageCode;

            const { data: shopData } = await storefrontClient.query({
                query: gql`
                    query shop @inContext(language: ${language}, country: ${country}) {
                        shop {
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

            const res = (
                await prismic().getSingle('store', {
                    lang: locale === '__default' ? Config.i18n.locales[0] : locale
                })
            ).data;

            const currencies = res.currencies.map((item) => item.currency);

            // FIXME: add custom_header_tags, custom_body_tags; or do this through gtm and instead just provide a gtm_id.
            return resolve({
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
                    secondary: shopData?.shop?.brand?.colors.secondary?.[0]?.foreground  || res.primary_text_color
                },
                currencies: shopData?.shop?.paymentSettings?.enabledPresentmentCurrencies || currencies,
                languages: Config.i18n.locales,
                social: res.social,
                block: {
                    border_radius: res.border_radius || '0.5rem'
                },
                payment: {
                    methods: shopData?.shop?.paymentSettings?.acceptedCardBrands || [],
                    wallets: shopData?.shop?.paymentSettings?.supportedDigitalWallets || []
                }
            });
        } catch (error) {
            console.error(error);
            if (error.message.includes('No documents') && locale !== Config.i18n.locales[0]) {
                return resolve(await StoreApi({ locale })); // Try again with default locale
            }

            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

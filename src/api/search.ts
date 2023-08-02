import { NextLocaleToCountry, NextLocaleToLanguage } from 'src/util/Locale';

import { Config } from 'src/util/Config';
import { PRODUCT_FRAGMENT_MINIMAL } from './product';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import { captureException } from '@sentry/nextjs';
import { gql } from '@apollo/client';
import { storefrontClient } from './shopify';

export const SearchApi = async ({
    query,
    locale,
    limit
}: {
    query: string;
    locale?: string;
    limit?: number;
}): Promise<{
    products: Product[];
    productFilters: any[];
}> => {
    return new Promise(async (resolve, reject) => {
        if (!query) return reject();
        if (!locale || locale === 'x-default') locale = Config.i18n.default;

        const country = NextLocaleToCountry(locale);
        const language = NextLocaleToLanguage(locale);

        const search = async ({ type }: { type: 'PRODUCT' }) => {
            const { data } = await storefrontClient.query({
                query: gql`
                    query searchProducts($query: String!, $first: Int) @inContext(language: ${language}, country: ${country}) {
                        search(query: $query, first: $first, types: ${type}) {
                            productFilters {
                                id
                                label
                                type
                                values {
                                    id
                                    label
                                    count
                                    input
                                }
                            }
                            edges {
                                node {
                                    ... on Product {
                                        ${PRODUCT_FRAGMENT_MINIMAL}
                                        trackingParameters
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    query,
                    first: limit || 75
                }
            });

            return {
                result: data?.search?.edges?.map((item) => item?.node) || [],
                productFilters: data?.search?.productFilters || []
            };
        };

        try {
            const { result: products, productFilters } = await search({ type: 'PRODUCT' });
            return resolve({
                products,
                productFilters
            });
        } catch (error) {
            captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

export const SearchPredictionApi = async ({
    query,
    locale
}: {
    query: string;
    locale?: string;
}): Promise<{
    products?: Product[];
    queries?: {
        styledText: string;
        text: string;
        trackingParameters?: string | null;
    }[];
}> => {
    return new Promise(async (resolve, reject) => {
        if (!query) return reject();
        if (!locale || locale === 'x-default') locale = Config.i18n.default;

        const country = NextLocaleToCountry(locale);
        const language = NextLocaleToLanguage(locale);

        const { data } = await storefrontClient.query({
            query: gql`
                query predictiveSearch($query: String!) @inContext(language: ${language}, country: ${country}) {
                    predictiveSearch(query: $query, type: [PRODUCT, QUERY]s) {
                        products {
                            ${PRODUCT_FRAGMENT_MINIMAL}
                            trackingParameters
                        }
                        queries {
                            styledText
                            text
                            trackingParameters
                        }
                    }
                }
            `,
            variables: {
                query
            }
        });

        const { queries, products } = data?.predictiveSearch;

        return resolve({
            products,
            queries
        });
    });
};

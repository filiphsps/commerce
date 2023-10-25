import { NextLocaleToCountry, NextLocaleToLanguage } from '@/utils/locale';

import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/product';
import { storefrontClient } from '@/api/shopify';
import { BuildConfig } from '@/utils/build-config';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import { gql } from 'graphql-tag';

// TODO: Migrate to the new recommendations api.
// TODO: Migrate to `Locale` type.
export const RecommendationApi = async ({ id, locale }: { id?: string; locale?: string }): Promise<Product[]> => {
    return new Promise(async (resolve, reject) => {
        if (!id || !id.includes('gid://shopify')) return reject(new Error('Invalid ID'));
        if (!locale || locale === 'x-default') locale = BuildConfig.i18n.default;

        const country = NextLocaleToCountry(locale);
        const language = NextLocaleToLanguage(locale);

        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query productRecommendations($productId: ID!) @inContext(language: ${language}, country: ${country}) {
                        productRecommendations(productId: $productId, intent: RELATED) {
                            ${PRODUCT_FRAGMENT_MINIMAL}
                        }
                    }
                `,
                variables: {
                    productId: id
                }
            });

            if (errors) return reject(new Error(`500: ${errors.map((i) => i.message).join('\n')}`));
            if (!data?.productRecommendations) return reject(new Error('404: The requested document cannot be found'));

            return resolve(/*flattenConnection(*/ data.productRecommendations /*)*/);
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

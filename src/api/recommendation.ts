import * as Sentry from '@sentry/nextjs';

import { CountryCode, LanguageCode, Product } from '@shopify/hydrogen-react/storefront-api-types';
import { ExtractAccentColorsFromImage, PRODUCT_FRAGMENT } from './product';

import { gql } from '@apollo/client';
import { i18n } from '../../next-i18next.config.cjs';
import { storefrontClient } from './shopify';

// TODO: Migrate to the new recommendations api
export const RecommendationApi = async ({
    id,
    locale
}: {
    id?: string;
    locale?: string;
}): Promise<Product[]> => {
    return new Promise(async (resolve, reject) => {
        if (!id || !id.includes('gid://shopify')) return reject(new Error('Invalid ID'));

        if (!locale || locale === 'x-default') locale = i18n.locales[1];

        const country = (
            locale?.split('-')[1] || i18n.locales[1].split('-')[1]
        ).toUpperCase() as CountryCode;
        const language = (
            locale?.split('-')[0] || i18n.locales[1].split('-')[0]
        ).toUpperCase() as LanguageCode;

        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query productRecommendations($productId: ID!) @inContext(language: ${language}, country: ${country}) {
                        productRecommendations(productId: $productId) {
                            ${PRODUCT_FRAGMENT}
                            trackingParameters
                        }
                    }
                `,
                variables: {
                    productId: id
                }
            });

            if (errors) return reject(new Error(errors.join('\n')));
            if (!data?.productRecommendations)
                return reject(new Error('404: The requested document cannot be found'));

            if (data.productRecommendations)
                data.productRecommendations = await Promise.all(
                    data.productRecommendations.map(async (product) => {
                        if (!product?.images?.edges?.at(0)?.node?.url) return product;

                        try {
                            product.accent = await ExtractAccentColorsFromImage(
                                product?.images?.edges?.at(0)?.node?.url
                            );
                            return product;
                        } catch {
                            return product;
                        }
                    })
                );

            return resolve(/*flattenConnection(*/ data.productRecommendations /*)*/);
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

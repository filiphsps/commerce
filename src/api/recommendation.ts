import * as Sentry from '@sentry/nextjs';

import { CountryCode, LanguageCode, Product } from '@shopify/hydrogen-react/storefront-api-types';

import { Config } from '../util/Config';
import { PRODUCT_FRAGMENT } from './product';
import { gql } from '@apollo/client';
import { storefrontClient } from './shopify';

export const RecommendationApi = async ({
    id,
    locale
}: {
    id: string;
    locale?: string;
}): Promise<Product[]> => {
    return new Promise(async (resolve, reject) => {
        if (!id || !id.includes('gid://shopify')) return reject(new Error('Invalid ID'));

        if (locale === 'x-default') locale = Config.i18n.locales[0];

        const country = (
            locale?.split('-')[1] || Config.i18n.locales[0].split('-')[1]
        ).toUpperCase() as CountryCode;
        const language = (
            locale?.split('-')[0] || Config.i18n.locales[0].split('-')[0]
        ).toUpperCase() as LanguageCode;

        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query productRecommendations($productId: ID!) @inContext(language: ${language}, country: ${country}) {
                        productRecommendations(productId: $productId) {
                            ${PRODUCT_FRAGMENT}
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

            return resolve(/*flattenConnection(*/ data.productRecommendations /*)*/);
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

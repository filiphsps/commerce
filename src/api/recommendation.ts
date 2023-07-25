import type {
    CountryCode,
    LanguageCode,
    Product
} from '@shopify/hydrogen-react/storefront-api-types';

import { gql } from '@apollo/client';
import { captureException } from '@sentry/nextjs';
import { i18n } from '../../next-i18next.config.cjs';
import { PRODUCT_FRAGMENT_MINIMAL } from './product';
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
                        productRecommendations(productId: $productId, intent: RELATED) {
                            ${PRODUCT_FRAGMENT_MINIMAL}
                        }
                    }
                `,
                variables: {
                    productId: id
                }
            });

            if (errors) return reject(new Error(errors.map((i) => i.message).join('\n')));
            if (!data?.productRecommendations)
                return reject(new Error('404: The requested document cannot be found'));

            return resolve(/*flattenConnection(*/ data.productRecommendations /*)*/);
        } catch (error) {
            captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

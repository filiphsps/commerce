import * as Sentry from '@sentry/nextjs';

import { PRODUCT_FRAGMENT, Convertor as ProductConvertor } from './product';

import { Config } from '../util/Config';
import { gql } from '@apollo/client';
import { newShopify } from './shopify';

export const RecommendationApi = async ({
    id,
    locale: loc
}: {
    id: string;
    locale?: string;
}) => {
    return new Promise(async (resolve, reject) => {
        if (!id) return reject();

        const locale = loc === '__default' ? Config.i18n.locales[0] : loc;
        // FIXME: Don't assume en-US
        const language = locale ? locale.split('-')[0].toUpperCase() : 'EN';
        const country = locale ? locale.split('-').at(-1)?.toUpperCase() : 'US';

        let formatted_id = id;
        if (!id.includes('/')) formatted_id = `gid://shopify/Product/${id}`;

        try {
            const { data, errors } = await newShopify.query({
                query: gql`
                fragment product on Product {
                    ${PRODUCT_FRAGMENT}
                }
                query recommendations($id: ID!) @inContext(language: ${language}, country: ${country}) {
                    productRecommendations(productId: $id) {
                        ...product
                    }
                }
                `,
                variables: {
                    id: btoa(formatted_id)
                }
            });

            if (errors && errors.length > 0) return reject(errors);

            const result = data?.productRecommendations?.map((product) =>
                ProductConvertor(product)
            );
            if (!result) return reject();

            return resolve(result);
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

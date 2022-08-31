import { PRODUCT_FRAGMENT, Convertor as ProductConvertor } from './product';

import { gql } from '@apollo/client';
import { newShopify } from './shopify';

export const RecommendationApi = async ({
    id,
    locale
}: {
    id: string;
    locale?: string;
}) => {
    return new Promise(async (resolve, reject) => {
        if (!id) return reject();

        const language = locale ? locale.split('-')[0].toUpperCase() : 'EN';
        const country = locale ? locale.split('-').at(-1).toUpperCase() : 'US';

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
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};

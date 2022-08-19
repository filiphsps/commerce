import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const CheckoutApi = async (items: any) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await shopify.query({
                query: gql`
                    mutation checkoutCreate($input: CheckoutCreateInput!) {
                        checkoutCreate(input: $input) {
                            checkout {
                                id
                                webUrl
                            }
                            checkoutUserErrors {
                                code
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        lineItems: items?.map((line_item) => ({
                            quantity: line_item?.quantity,
                            variantId: btoa(line_item?.id.split('#')[1])
                        }))
                    }
                }
            });

            if (!data?.checkoutCreate?.checkout)
                return reject(data?.checkoutCreate?.checkoutUserErrors);

            return resolve(data?.checkoutCreate?.checkout?.webUrl);
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};

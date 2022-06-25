import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const CheckoutApi = async (cart: any) => {
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
                        lineItems: cart?.items?.map((line_item) => ({
                            quantity: line_item?.quantity,
                            variantId: btoa(line_item?.variant_id)
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

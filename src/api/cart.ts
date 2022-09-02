import { gql } from '@apollo/client';
import { newShopify } from './shopify';

export const CartApi = async () => {
    return new Promise(async (resolve, reject) => {
        const { data, errors } = await newShopify.query({
            query: gql`
                mutation cartCreate($input: CartInput!) {
                    cartCreate(input: $input) {
                        cart {
                            id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    lines: []
                }
            }
        });
        resolve(null);
    });
};

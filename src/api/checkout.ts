import * as Sentry from '@sentry/nextjs';

import { Config } from '../util/Config';
import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const CheckoutApi = async ({
    items,
    locale = Config.i18n.locales[0]
}: {
    items: any[];
    locale: string;
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const line_items = items?.map((line_item) => ({
                quantity: line_item?.quantity,
                variantId: btoa(
                    `gid://shopify/ProductVariant/${line_item?.id
                        .split('#')[1]
                        .replace('gid://shopify/ProductVariant/', '')}`
                )
            }));

            // eslint-disable-next-line no-console
            const { data, errors } = await shopify.query({
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
                        buyerIdentity: {
                            countryCode: (locale || Config.i18n.locales[0]).split('-')[-1] || 'US'
                        },
                        lineItems: line_items
                    }
                }
            });

            if (errors && errors.length > 0) return reject(errors[0]);

            if (!data?.checkoutCreate?.checkout)
                return reject(data?.checkoutCreate?.checkoutUserErrors);

            return resolve(data?.checkoutCreate?.checkout?.webUrl);
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

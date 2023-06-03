import * as Sentry from '@sentry/nextjs';

import { GetToken } from '../util/customer/token';
import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const Convertor = (orders: any) => {
    return orders
        ?.map((order) => order.node)
        ?.map((order) => ({
            created_at: new Date(order?.processedAt),
            name: order?.name,
            status: order?.fulfillmentStatus,
            status_url: order?.statusUrl,
            payment_status: order?.financialStatus,
            price: order?.totalPriceV2?.amount,
            currency: order?.totalPriceV2?.currencyCode,

            line_items: order?.lineItems?.edges?.map((line_item) => line_item?.node)
        }));
};

export const OrdersApi = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await shopify.query({
                query: gql`
                    query orders($token: String!) {
                        customer(customerAccessToken: $token) {
                            orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {
                                edges {
                                    node {
                                        id
                                        processedAt
                                        name
                                        fulfillmentStatus
                                        financialStatus
                                        statusUrl
                                        totalPriceV2 {
                                            amount
                                            currencyCode
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    token: ((await GetToken()) as any).accessToken
                }
            });

            if (errors) throw errors;

            if (!data?.customer) return reject(new Error('TODO:'));

            return resolve(Convertor(data?.customer?.orders?.edges));
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

export const OrderApi = async (id: string) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await shopify.query({
                query: gql`
                    query orders($token: String!) {
                        customer(customerAccessToken: $token) {
                            orders(first: 250) {
                                edges {
                                    node {
                                        id
                                        processedAt
                                        name
                                        fulfillmentStatus
                                        financialStatus
                                        totalPriceV2 {
                                            amount
                                            currencyCode
                                        }
                                        lineItems(first: 250) {
                                            edges {
                                                node {
                                                    title
                                                    variant {
                                                        id
                                                    }

                                                    quantity
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    token: ((await GetToken()) as any).accessToken
                }
            });

            if (errors) throw errors;

            if (!data?.customer) return reject(new Error('TODO:'));

            // HACK
            return resolve(
                Convertor(data?.customer?.orders?.edges)?.filter((a) => a?.name === `#${id}`)[0]
            );
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};

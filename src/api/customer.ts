import { GetToken } from '../util/customer/token';
import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const CustomerLoginApi = async (customer: any) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await shopify.query({
                query: gql`
                    mutation customerAccessTokenCreate(
                        $input: CustomerAccessTokenCreateInput!
                    ) {
                        customerAccessTokenCreate(input: $input) {
                            customerAccessToken {
                                accessToken
                                expiresAt
                            }
                            customerUserErrors {
                                code
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        ...customer
                    }
                }
            });

            if (!data?.customerAccessTokenCreate?.customerAccessToken)
                return reject(
                    data?.customerAccessTokenCreate?.customerUserErrors
                );

            resolve(data?.customerAccessTokenCreate?.customerAccessToken);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

export const CustomerRegisterApi = async (customer: any) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await shopify.query({
                query: gql`
                    mutation customerAccessTokenCreate(
                        $input: CustomerAccessTokenCreateInput!
                    ) {
                        customerCreate(input: $input) {
                            customer {
                                email
                            }
                            customerUserErrors {
                                code
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        ...customer,
                        acceptsMarketing: true
                    }
                }
            });

            if (data?.customerCreate?.customerUserErrors)
                return reject(data?.customerCreate?.customerUserErrors);

            resolve(null);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

export const CustomerRecoverApi = async (email: any) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await shopify.query({
                query: gql`
                    mutation customerAccessTokenCreate($email: String!) {
                        customerRecover(email: $email) {
                            customerUserErrors {
                                code
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    email
                }
            });

            if (data?.customerRecover?.customerUserErrors || errors)
                return reject(
                    data?.customerRecover?.customerUserErrors || errors
                );

            resolve(null);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

export const CustomerApi = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await shopify.query({
                query: gql`
                    query orders($token: String!) {
                        customer(customerAccessToken: $token) {
                            displayName
                            createdAt
                            defaultAddress {
                                address1
                                address2
                                city
                                company
                                country

                                firstName
                                lastName
                            }
                        }
                    }
                `,
                variables: {
                    token: ((await GetToken()) as any).accessToken
                }
            });

            if (errors) throw errors;

            if (!data?.customer) return reject();

            resolve(data?.customer);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

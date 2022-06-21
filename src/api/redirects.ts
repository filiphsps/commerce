import { RedirectModel } from '../models/RedirectModel';
import { gql } from '@apollo/client';
import { newShopify } from './shopify';

export const Convertor = (
    redirects: Array<{
        node: any;
    }>
): Array<RedirectModel> => {
    let entries = [];
    redirects.forEach((redirect) => {
        entries.push(redirect?.node);
    });

    // Remove duplicates and create a proper object
    return Array.from(new Set(entries)).map((redirect) => ({
        id: redirect.id,
        path: redirect.path,
        target: redirect.target
    }));
};

export const RedirectsApi = async (): Promise<Array<RedirectModel>> => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await newShopify.query({
                query: gql`
                    query urlRedirects {
                        urlRedirects(first: 250) {
                            edges {
                                node {
                                    id
                                    path
                                    target
                                }
                            }
                        }
                    }
                `
            });

            return resolve(Convertor(res?.data?.urlRedirects?.edges));
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};

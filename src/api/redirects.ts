import * as Sentry from '@sentry/nextjs';

import { RedirectModel } from '../models/RedirectModel';
import { gql } from '@apollo/client';
import { newShopify } from './shopify';

export const Convertor = (
    redirects: Array<{
        node: any;
    }>
): Array<RedirectModel> => {
    let entries: any[] = [];
    redirects.forEach((redirect) => {
        entries.push(redirect?.node);
    });

    // Remove duplicates and create a proper object
    return Array.from(new Set(entries)).map((redirect) => ({
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
                                    path
                                    target
                                }
                            }
                        }
                    }
                `
            });

            return resolve(Convertor(res?.data?.urlRedirects?.edges));
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

export const RedirectProductApi = async (handle: string) => {
    return new Promise(async (resolve) => {
        const redirects = await RedirectsApi();
        for (let i = 0; i < redirects.length; i++) {
            const redirect = redirects[i];

            if (!redirect.path.includes(`/${handle}`)) continue;

            return resolve(redirect.target);
        }
        return resolve(null);
    });
};

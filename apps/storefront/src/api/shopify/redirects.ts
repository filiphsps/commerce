import { gql } from '@apollo/client';

import type { RedirectModel } from '@/models/RedirectModel';
import type { AbstractApi } from '@/utils/abstract-api';
import type { UrlRedirect, UrlRedirectConnection } from '@shopify/hydrogen-react/storefront-api-types';

/**
 * Convert the Shopify redirect list to a list of redirects.
 * TODO: Remove this and use the standard layout.
 *
 * @param {Array<{ node: any }>} redirects - The list of redirects.
 * @returns {RedirectModel[]} - The list of redirects.
 */
export const Convertor = (redirects: UrlRedirect[]): Array<RedirectModel> => {
    let entries: any[] = [];
    redirects.forEach((redirect) => {
        entries.push(redirect);
    });

    // Remove duplicates and create a proper object
    return Array.from(new Set(entries)).map((redirect) => ({
        path: redirect.path,
        target: redirect.target
    }));
};

/**
 * Get all redirects from Shopify.
 *
 * @param {object} options - The options.
 * @param {AbstractApi} options.api - The client to use for the query.
 * @param {string} [options.cursor] - The cursor to use for the query.
 * @param {UrlRedirect[]} [options.redirects]
 * @returns {Promise<RedirectModel[]>} The list of redirects.
 */
export const RedirectsApi = async ({
    api,
    cursor,
    redirects = []
}: {
    api: AbstractApi;
    cursor?: string;
    redirects?: UrlRedirect[];
}): Promise<RedirectModel[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await api.query<{ urlRedirects: UrlRedirectConnection }>(
                gql`
                    query urlRedirects($limit: Int!) {
                        urlRedirects(first: $limit ${(cursor && `, after: "${cursor}"`) || ''}) {
                            edges {
                                cursor
                                node {
                                    path
                                    target
                                }
                            }
                            pageInfo {
                                hasNextPage
                            }
                        }
                    }
                `,
                {
                    limit: 250
                }
            );

            if (errors) {
                return reject(new Error(`500: ${errors.map((e: any) => e.message).join('\n')}`));
            } else if (!data?.urlRedirects.edges && redirects.length <= 0) {
                return reject(new Error(`404: No redirects could be found`));
            }

            if (data) {
                cursor = data.urlRedirects.edges.at(-1)!.cursor;
                redirects.push(...data.urlRedirects.edges.map((edge) => edge.node));
            }

            if (data?.urlRedirects.pageInfo.hasNextPage) {
                return resolve(await RedirectsApi({ api, cursor, redirects }));
            }

            return resolve(Convertor(redirects));
        } catch (error: unknown) {
            console.error(error);
            return reject(error);
        }
    });
};

/**
 * Get specific redirect from Shopify.
 *
 * @param {object} options - The options.
 * @param {AbstractApi} options.api - The client to use for the query.
 * @param {string} options.path - The path to get the redirect for.
 * @returns {Promise<string | null>} The redirect target.
 */
export const RedirectApi = async ({ api, path }: { api: AbstractApi; path: string }): Promise<string | null> => {
    return new Promise(async (resolve, reject) => {
        try {
            const redirects = await RedirectsApi({ api });

            for (let i = 0; i < redirects.length; i++) {
                const redirect = redirects[i];

                if (redirect.path !== path) continue;

                return resolve(redirect.target);
            }
            return resolve(null);
        } catch (error: unknown) {
            return reject(error);
        }
    });
};

export const RedirectProductApi = async ({ api, handle }: { api: AbstractApi; handle: string }) =>
    RedirectApi({ path: `/products/${handle}`, api }) as Promise<`/products/${string}` | null>;
export const RedirectCollectionApi = async ({ api, handle }: { api: AbstractApi; handle: string }) =>
    RedirectApi({ path: `/collections/${handle}`, api }) as Promise<`/collections/${string}` | null>;

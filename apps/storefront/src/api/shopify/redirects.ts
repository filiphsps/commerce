import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';

import { gql } from '@apollo/client';
import { flattenConnection } from '@shopify/hydrogen-react';

import type { AbstractApi } from '@/utils/abstract-api';
import type { UrlRedirect, UrlRedirectConnection } from '@shopify/hydrogen-react/storefront-api-types';

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
}): Promise<UrlRedirect[]> => {
    const shop = api.shop();

    try {
        const { data, errors } = await api.query<{ urlRedirects: UrlRedirectConnection }>(
            gql`
                query urlRedirects($limit: Int!, $after: String) {
                    urlRedirects(first: $limit, after: $after) {
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
                limit: 250,
                after: cursor || null
            }
        );

        const urlRedirects = data ? flattenConnection(data.urlRedirects) : null;

        if (errors && errors.length > 0) {
            throw new ProviderFetchError(errors);
        } else if ((!urlRedirects || urlRedirects.length <= 0) && redirects.length <= 0) {
            throw new NotFoundError(`"Redirects" on shop "${shop.id}"`);
        }

        if (data && urlRedirects) {
            cursor = data.urlRedirects.edges.at(-1)!.cursor;
            redirects.push(
                ...urlRedirects.map(({ id, path, target }) => ({
                    id,
                    path: path.toLowerCase(),
                    target: target.toLowerCase()
                }))
            );
        }

        if (data?.urlRedirects.pageInfo.hasNextPage) {
            return RedirectsApi({ api, cursor, redirects });
        }

        return redirects;
    } catch (error: unknown) {
        throw error;
    }
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
    path = path.toLowerCase();
    if (path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    // Let's first check if we can query the redirects directly.
    const { data, errors } = await api.query<{ urlRedirects: UrlRedirectConnection }>(
        gql`
            query urlRedirects($limit: Int!, $query: String) {
                urlRedirects(first: $limit, query: $query) {
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
            limit: 1,
            query: `path:${path}*`
        }
    );

    if (!errors && data && data.urlRedirects.edges.length > 0) {
        const redirect = flattenConnection(data.urlRedirects)[0];
        if ((redirect as any) && redirect.target) {
            return redirect.target;
        }
    }

    try {
        const redirects = await RedirectsApi({ api });
        return redirects.find((redirect) => redirect.path === path)?.target || null;
    } catch (error: unknown) {
        throw error;
    }
};

export const RedirectProductApi = async ({ api, handle }: { api: AbstractApi; handle: string }) =>
    RedirectApi({ path: `/products/${handle}`, api });
export const RedirectCollectionApi = async ({ api, handle }: { api: AbstractApi; handle: string }) =>
    RedirectApi({ path: `/collections/${handle}`, api });

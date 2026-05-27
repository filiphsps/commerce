import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { flattenConnection } from '@shopify/hydrogen-react';
import type { UrlRedirect } from '@shopify/hydrogen-react/storefront-api-types';
import type { AbstractApi } from '@/utils/abstract-api';

const URL_REDIRECTS_LIST_QUERY = graphql(`
    query urlRedirects($limit: Int!, $after: String) {
        urlRedirects(first: $limit, after: $after) {
            edges {
                cursor
                node {
                    id
                    path
                    target
                }
            }
            pageInfo {
                hasNextPage
            }
        }
    }
`);

const URL_REDIRECTS_SEARCH_QUERY = graphql(`
    query urlRedirectsSearch($limit: Int!, $query: String) {
        urlRedirects(first: $limit, query: $query) {
            edges {
                cursor
                node {
                    id
                    path
                    target
                }
            }
            pageInfo {
                hasNextPage
            }
        }
    }
`);

/**
 * Get all redirects from Shopify.
 *
 * @param options - The options.
 * @param options.api - The client to use for the query.
 * @param [options.cursor] - The cursor to use for the query.
 * @param [options.redirects] - Accumulated redirects from previous pages; omitted on the first call.
 * @returns The list of redirects.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {NotFoundError} When no redirects exist for the shop.
 */
export const RedirectsApi = async ({
    api,
    cursor,
    redirects = [],
}: {
    api: AbstractApi;
    cursor?: string;
    redirects?: UrlRedirect[];
}): Promise<UrlRedirect[]> => {
    const shop = api.shop();
    const { data, errors } = await api.query(URL_REDIRECTS_LIST_QUERY, {
        limit: 250,
        after: cursor || null,
    });

    const urlRedirects = data ? flattenConnection(data.urlRedirects) : null;

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    } else if ((!urlRedirects || urlRedirects.length <= 0) && redirects.length <= 0) {
        throw new NotFoundError(`"Redirects" on shop "${shop.id}"`);
    }

    if (data && urlRedirects) {
        const lastEdge = data.urlRedirects.edges.at(-1);
        if (lastEdge) cursor = lastEdge.cursor;
        redirects.push(
            ...urlRedirects.map(({ id, path, target }) => ({
                id,
                path: path.toLowerCase(),
                target: target.toLowerCase(),
            })),
        );
    }

    if (data?.urlRedirects.pageInfo.hasNextPage) {
        return RedirectsApi({ api, cursor, redirects });
    }

    return redirects;
};

/**
 * Get specific redirect from Shopify.
 *
 * @param options - The options.
 * @param options.api - The client to use for the query.
 * @param options.path - The path to get the redirect for.
 * @returns The redirect target, or `null` if none found.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {NotFoundError} When no redirects exist for the shop.
 */
export const RedirectApi = async ({ api, path }: { api: AbstractApi; path: string }): Promise<string | null> => {
    path = path.toLowerCase();
    if (path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    // Let's first check if we can query the redirects directly.
    const { data, errors } = await api.query(URL_REDIRECTS_SEARCH_QUERY, {
        limit: 1,
        query: `path:${path}*`,
    });

    if (!errors && data && data.urlRedirects.edges.length > 0) {
        const redirect = flattenConnection(data.urlRedirects)[0];
        if (redirect?.target) {
            return redirect.target;
        }
    }
    const redirects = await RedirectsApi({ api });
    return redirects.find((redirect) => redirect.path === path)?.target || null;
};

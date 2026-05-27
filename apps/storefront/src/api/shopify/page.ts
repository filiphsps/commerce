import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql, type ResultOf, readFragment } from '@nordcom/commerce-shopify-graphql/graphql';
import { flattenConnection } from '@shopify/hydrogen-react';
import type { AbstractApi, ApiReturn } from '@/utils/abstract-api';

export type NormalizedShopifyPage = {
    id: string;
    handle: string;
    title: string;
    body: string;
    bodySummary: string;
    seo: { title: string | null; description: string | null };
    createdAt: string;
    updatedAt: string;
    onlineStoreUrl: string | null;
};

const PAGE_FIELDS_FRAGMENT = graphql(`
    fragment PageFields on Page {
        id
        handle
        title
        body
        bodySummary
        seo {
            title
            description
        }
        createdAt
        updatedAt
        onlineStoreUrl
        trackingParameters
    }
`);

const PAGE_QUERY = graphql(
    `
    query page($handle: String!) {
        page(handle: $handle) {
            ...PageFields
        }
    }
`,
    [PAGE_FIELDS_FRAGMENT],
);

const PAGES_QUERY = graphql(
    `
    query pages($first: Int!, $after: String) {
        pages(first: $first, after: $after) {
            edges {
                cursor
                node {
                    ...PageFields
                }
            }
            pageInfo {
                hasNextPage
            }
        }
    }
`,
    [PAGE_FIELDS_FRAGMENT],
);

type PageFields = ResultOf<typeof PAGE_FIELDS_FRAGMENT>;

/**
 * Transforms a Shopify page fragment into the normalized `NormalizedShopifyPage` shape.
 *
 * @param page - Raw page fragment read from `PAGE_FIELDS_FRAGMENT`.
 * @returns Normalized page with nullable SEO fields and a guaranteed `onlineStoreUrl`.
 */
function normalize(page: PageFields): NormalizedShopifyPage {
    return {
        id: page.id,
        handle: page.handle,
        title: page.title,
        body: page.body,
        bodySummary: page.bodySummary,
        seo: {
            title: page.seo?.title ?? null,
            description: page.seo?.description ?? null,
        },
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        onlineStoreUrl: page.onlineStoreUrl ?? null,
    };
}

/**
 * Fetches a single Shopify page by handle.
 *
 * @param options - Storefront API client and the page handle to fetch.
 * @param options.api - Storefront API client.
 * @param options.handle - Page handle to fetch.
 * @returns A result tuple — `[NormalizedShopifyPage, undefined]` on success or `[undefined, error]` on failure.
 */
export async function ShopifyPageApi({
    api,
    handle,
}: {
    api: AbstractApi;
    handle: string;
}): Promise<ApiReturn<NormalizedShopifyPage>> {
    if (!handle) {
        return [undefined, new InvalidHandleError(handle)];
    }

    const { data, errors } = await api.query(PAGE_QUERY, { handle });

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data?.page) {
        const shop = api.shop();
        return [undefined, new NotFoundError(`"Page" with handle "${handle}" on shop "${shop.id}"`)];
    }

    return [normalize(readFragment(PAGE_FIELDS_FRAGMENT, data.page)), undefined];
}

/**
 * Recursively fetches all Shopify pages, paginating until exhausted.
 *
 * @param options - Storefront API client and accumulated pagination state from previous recursive calls.
 * @param options.api - Storefront API client.
 * @param options.cursor - Pagination cursor for the next page; omitted on the first call.
 * @param options.pages - Accumulated results from previous pages; omitted on the first call.
 * @returns A result tuple — `[NormalizedShopifyPage[], undefined]` on success or `[undefined, error]` on failure.
 */
export async function ShopifyPagesApi({
    api,
    cursor,
    pages = [],
}: {
    api: AbstractApi;
    cursor?: string;
    pages?: NormalizedShopifyPage[];
}): Promise<ApiReturn<NormalizedShopifyPage[]>> {
    const { data, errors } = await api.query(PAGES_QUERY, { first: 250, after: cursor || null });

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data) {
        return [pages, undefined];
    }

    const fetched = flattenConnection(data.pages).map((node) => normalize(readFragment(PAGE_FIELDS_FRAGMENT, node)));
    pages.push(...fetched);

    if (data.pages.pageInfo.hasNextPage) {
        const lastCursor = data.pages.edges.at(-1)?.cursor;
        return ShopifyPagesApi({ api, cursor: lastCursor, pages });
    }

    return [pages, undefined];
}

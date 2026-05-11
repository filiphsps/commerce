import { gql } from '@apollo/client';
import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { flattenConnection } from '@shopify/hydrogen-react';
import type { Page, PageConnection } from '@shopify/hydrogen-react/storefront-api-types';
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

const PAGE_FRAGMENT = /* GraphQL */ `
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
`;

function normalize(page: Page): NormalizedShopifyPage {
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

    const { data, errors } = await api.query<{ page: Page | null }>(
        gql`
            query page($handle: String!) {
                page(handle: $handle) {
                    ${PAGE_FRAGMENT}
                }
            }
        `,
        { handle },
    );

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data?.page) {
        const shop = api.shop();
        return [undefined, new NotFoundError(`"Page" with handle "${handle}" on shop "${shop.id}"`)];
    }

    return [normalize(data.page), undefined];
}

export async function ShopifyPagesApi({
    api,
    cursor,
    pages = [],
}: {
    api: AbstractApi;
    cursor?: string;
    pages?: NormalizedShopifyPage[];
}): Promise<ApiReturn<NormalizedShopifyPage[]>> {
    const { data, errors } = await api.query<{ pages: PageConnection }>(
        gql`
            query pages($first: Int!, $after: String) {
                pages(first: $first, after: $after) {
                    edges {
                        cursor
                        node {
                            ${PAGE_FRAGMENT}
                        }
                    }
                    pageInfo {
                        hasNextPage
                    }
                }
            }
        `,
        { first: 250, after: cursor || null },
    );

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data) {
        return [pages, undefined];
    }

    const fetched = flattenConnection(data.pages).map(normalize);
    pages.push(...fetched);

    if (data.pages.pageInfo.hasNextPage) {
        const lastCursor = data.pages.edges.at(-1)?.cursor;
        return ShopifyPagesApi({ api, cursor: lastCursor, pages });
    }

    return [pages, undefined];
}

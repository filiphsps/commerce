import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { trace } from '@opentelemetry/api';
import { cacheLife, cacheTag } from 'next/cache';
import { Shop } from '@/api/_loaders';
import type { Product, ProductFilters } from '@/api/product';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product-fragments';
import { cache } from '@/cache';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { unsafe_cast } from '@/utils/unsafe-cast';

export const SEARCH_PRODUCTS_QUERY = graphql(
    `
    query searchProducts($query: String!, $first: Int, $type: [SearchType!]) {
        search(query: $query, first: $first, types: $type) {
            totalCount
            productFilters {
                id
                label
                presentation
                type
                values {
                    id
                    label
                    count
                    input
                    swatch {
                        color
                    }
                }
            }
            edges {
                node {
                    ... on Product {
                        ...ProductMinimal
                    }
                }
            }
        }
    }
`,
    [PRODUCT_FRAGMENT_MINIMAL],
);

export const SearchApi = async ({
    client,
    query,
    limit,
}: {
    client: AbstractApi;
    query: string;
    limit?: number;
}): Promise<{
    products: Product[];
    productFilters: ProductFilters;
    totalCount: number;
}> => {
    if (!query) {
        return { products: [], productFilters: [], totalCount: 0 };
    }

    const search = async ({ type }: { type: 'PRODUCT' }) => {
        const { data, errors } = await client.query(SEARCH_PRODUCTS_QUERY, {
            query,
            type: [type],
            first: limit || 75,
        });

        // Without surfacing `errors` a Shopify failure (rate limit, invalid
        // query syntax, transient 5xx) collapses to "no results" — visually
        // identical to a legitimate empty result, so users get a broken
        // search experience with nothing in the logs to explain it.
        if (errors && errors.length > 0) {
            trace.getActiveSpan()?.addEvent('shopify.search_query_errors', {
                'error.message': String(errors),
                'search.query': query,
            });
        }

        return {
            // hydrogen-react types search edge nodes as RecursivePartial<Product>;
            // the Storefront API guarantees all queried fields are present.
            result: data?.search.edges.map((item) => unsafe_cast<Product>(item.node)) || [],
            productFilters: data?.search.productFilters || [],
            totalCount: data?.search.totalCount ?? 0,
        };
    };

    const { result: products, productFilters, totalCount } = await search({ type: 'PRODUCT' });
    return { products, productFilters, totalCount };
};

export async function cachedSearch({
    shopId,
    shopDomain,
    localeCode,
    query,
    showFilters: _showFilters,
}: {
    shopId: string;
    shopDomain: string;
    localeCode: string;
    query: string;
    // showFilters is part of the cache key only; flipping the flag produces a
    // distinct cache entry so callers observe the new value immediately rather
    // than after the cacheLife window.
    showFilters: boolean;
}): Promise<{ products: Product[]; productFilters: ProductFilters; totalCount: number }> {
    'use cache';
    cacheLife('hours');

    if (!query) {
        // Empty queries return a constant — no tagging needed since the
        // result never changes. tagtree also rejects empty segments, which
        // would throw if we tried to tag with query: ''.
        return { products: [], productFilters: [], totalCount: 0 };
    }

    cacheTag(
        ...cache.keys.search({
            tenant: { id: shopId, domain: shopDomain } as OnlineShop,
            qualifier: { code: localeCode } as Locale,
            query,
        }).tags,
    );

    const shop = await Shop.findByDomain(shopDomain, { sensitiveData: true });
    const locale = Locale.from(localeCode);
    const client = await ShopifyApolloApiClient({ shop, locale });

    return SearchApi({ client, query });
}

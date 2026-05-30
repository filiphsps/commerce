import 'server-only';

import type { Identifiable, LimitFilters, Nullable } from '@nordcom/commerce-db';
import { InvalidHandleError, ProviderFetchError, TodoError, UnreachableError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import type {
    CollectionEdge,
    CollectionSortKeys,
    ProductCollectionSortKeys,
} from '@shopify/hydrogen-react/storefront-api-types';
import { cache } from '@/cache';
import type { ApiOptions } from '@/utils/abstract-api';
import { isValidHandle } from '@/utils/handle';
import { unsafe_cast } from '@/utils/unsafe-cast';
import { COLLECTION_PAGINATION_COUNT_QUERY, COLLECTIONS_PAGINATION_QUERY } from './queries';

type GenericCollectionFilters = {
    after?: Nullable<string>;
    before?: Nullable<string>;
};

export type CollectionFilters = {
    sorting?: Nullable<ProductCollectionSortKeys>;
} & GenericCollectionFilters &
    LimitFilters;

type CollectionsFilters = {
    sorting?: Nullable<CollectionSortKeys>;
} & GenericCollectionFilters &
    LimitFilters;

/**
 * Converts the union-typed `LimitFilters` shape into the `first`/`last` object Shopify GraphQL expects.
 *
 * @param filters - Pagination filter; may carry `limit`, `first`, or `last`.
 * @param defaultLimit - Fallback item count when no limit is specified; defaults to `30`.
 * @returns An object with `first`, `last`, or both, matching Shopify's cursor-pagination args.
 * @throws {TodoError} When both `limit` and `first`/`last` are provided simultaneously.
 * @throws {UnreachableError} When the switch exhausts all cases without returning — indicates a caller passed a `LimitFilters` shape not covered by the current branches.
 */
// TODO: This should be generic.
export const extractLimitLikeFilters = (
    filters: LimitFilters,
    defaultLimit = 30,
):
    | {
          first: number;
      }
    | {
          last: number;
      }
    | {
          first: number;
          last: number;
      }
    | {} => {
    const f = filters as Record<string, unknown>;
    switch (true) {
        case filters === null || typeof filters === 'undefined':
        case typeof f.limit !== 'number' && typeof f.first !== 'number' && typeof f.last !== 'number':
        case !('limit' in filters) && !('first' in filters) && !('last' in filters):
            return {
                first: defaultLimit,
            };

        case 'limit' in filters:
            if ('first' in filters || 'last' in filters) {
                throw new TodoError(); // TODO: Add ErrorCode and Error for this.
            }
            return {
                first: filters.limit || defaultLimit,
            };

        case 'first' in filters || 'last' in filters:
            if (typeof filters.first === 'number' && typeof filters.last === 'number') {
                throw new TodoError(); // TODO: Add ErrorCode and Error for this.
            }
            return {
                first: filters.first || null,
                last: filters.last || null,
            };
    }

    // This should never actually be reachable.
    throw new UnreachableError();
};

type CollectionOptions = ApiOptions &
    Identifiable &
    (
        | {
              filters: CollectionFilters;
          }
        | /** @deprecated */ CollectionFilters
    );

/**
 * Counts all products in a collection across pages and returns per-page cursor positions.
 *
 * @param options - Storefront API client, collection handle, and pagination/sorting filters.
 * @param options.api - Storefront API client.
 * @param options.handle - Collection handle to paginate.
 * @returns Object with total `pages`, total `products`, and `cursors` array for cursor-based navigation.
 * @throws {InvalidHandleError} When `handle` fails the validity check.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 */
export const CollectionPaginationCountApi = async ({
    api,
    handle,
    ...props
}: CollectionOptions): Promise<{
    pages: number;
    products: number;
    cursors: string[];
}> => {
    if (!isValidHandle(handle)) {
        throw new InvalidHandleError(handle);
    }

    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as CollectionFilters);
    const filtersTag = JSON.stringify(filters, null, 0);

    // Walk the collection at Shopify's max page size rather than the grid's display size. Relay
    // edge cursors are position-stable across page sizes for a given sort key, so harvesting every
    // cursor from a wide walk lets us reconstruct the narrow per-page boundaries while issuing
    // ~12x fewer serial round-trips (a 400-product collection drops from ~19 calls to 2).
    const TRAVERSAL_PAGE_SIZE = 250;

    const collectCursors = async (allCursors: string[] = [], after: string | null = null): Promise<string[]> => {
        const { data, errors } = await api.query(
            COLLECTION_PAGINATION_COUNT_QUERY,
            {
                handle,
                first: TRAVERSAL_PAGE_SIZE,
                ...(({ sorting = 'COLLECTION_DEFAULT' }) => ({
                    sorting,
                    after,
                }))(filters),
            },
            {
                tags: [
                    ...cache.keys.collection({ tenant: api.shop(), handle }).tags,
                    'collection',
                    handle,
                    'pagination',
                    'count',
                    ...(filtersTag ? [filtersTag] : []),
                ],
            },
        );

        if (errors && errors.length > 0) {
            throw new ProviderFetchError(errors);
        }

        const products = data?.collection?.products;
        const edges = products?.edges;
        if (!edges || edges.length <= 0) {
            return allCursors;
        }

        for (const edge of edges) allCursors.push(edge.cursor ?? '');

        if (products.pageInfo.hasNextPage) {
            return collectCursors(allCursors, edges.at(-1)?.cursor ?? '');
        }

        return allCursors;
    };

    const flatCursors = await collectCursors();
    const products = flatCursors.length;

    const perPage = ((extractLimitLikeFilters(filters) as { first?: number })?.first || 30) as number;
    const pages = Math.ceil(products / perPage);

    // The grid asks for `after: cursors[page - 2]`, so page N starts after product (N-1)*perPage.
    // Slice those boundary cursors out of the flat walk — one per page after the first.
    const cursors: string[] = [];
    for (let page = 2; page <= pages; page++) {
        cursors.push(flatCursors[(page - 1) * perPage - 1] ?? '');
    }

    return {
        pages,
        cursors,
        products,
    };
};

type CollectionsOptions = ApiOptions &
    (
        | {
              filters: CollectionsFilters;
          }
        | /** @deprecated */ CollectionsFilters
    );

/**
 * Fetches a paginated slice of collections from the Shopify Storefront API.
 *
 * @param options - Storefront API client and pagination/sorting filters for the collections slice.
 * @param options.api - Storefront API client.
 * @param options.filters - Sorting and cursor constraints for the page request.
 * @returns Object with `collections` edges and `page_info` cursor metadata.
 * @throws {ProviderFetchError} When the Shopify query returns errors or page info is absent.
 */
export const CollectionsPaginationApi = async ({
    api,
    ...props
}: CollectionsOptions): Promise<{
    page_info: {
        start_cursor: string | null;
        end_cursor: string | null;
        has_next_page: boolean;
        has_prev_page: boolean;
    };
    collections: CollectionEdge[];
}> => {
    const shop = api.shop();
    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as CollectionsFilters);

    const { data, errors } = await api.query(
        COLLECTIONS_PAGINATION_QUERY,
        {
            ...extractLimitLikeFilters(filters),
            ...(({ sorting = 'RELEVANCE', before = null, after = null }) => ({
                sorting,
                before,
                after,
            }))(filters),
        },
        {
            tags: [...cache.keys.collections({ tenant: api.shop() }).tags, 'collections', 'pagination'],
        },
    );

    // The previous code destructured only `{ data }` and ignored `errors`
    // entirely. With Apollo's `errorPolicy: 'all'`, Shopify can return a
    // partial-success payload (`data` + `errors`) — we'd happily render the
    // partial result and the missing collections would silently disappear
    // from prod, masked as "empty list".
    if (errors && errors.length > 0) {
        trace.getActiveSpan()?.addEvent('shopify.collections_pagination_query_errors', {
            'error.message': String(errors),
            'shop.id': shop.id,
        });
        throw new ProviderFetchError(
            `"Collections" query on shop "${shop.id}": ${errors
                .map((e) => (e instanceof Error ? e.message : undefined))
                .filter((e) => e)
                .join(', ')}`,
        );
    }

    const page_info = data?.collections.pageInfo;
    if (!page_info) {
        throw new ProviderFetchError(`"Collections.pageInfo" on shop "${shop.id}"`);
    }

    return {
        // hydrogen-react types collection edges as RecursivePartial<CollectionEdge>[];
        // the Storefront API guarantees all queried fields are present at runtime.
        collections: unsafe_cast<CollectionEdge[]>(data.collections.edges),
        page_info: {
            start_cursor: page_info.startCursor || null,
            end_cursor: page_info.endCursor || null,
            has_next_page: page_info.hasNextPage,
            has_prev_page: page_info.hasPreviousPage,
        },
    };
};

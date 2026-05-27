import 'server-only';

import type { Identifiable } from '@nordcom/commerce-db';
import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { cache } from '@/cache';
import type { AbstractApi, ApiOptions } from '@/utils/abstract-api';
import { isValidHandle } from '@/utils/handle';
import { unsafe_cast } from '@/utils/unsafe-cast';
import { type CollectionFilters, extractLimitLikeFilters } from './pagination';
import { COLLECTION_QUERY, COLLECTIONS_QUERY } from './queries';

type CollectionOptions = ApiOptions &
    Identifiable &
    (
        | {
              filters: CollectionFilters;
          }
        | /** @deprecated */ CollectionFilters
    );

/**
 * Get a collection from Shopify.
 *
 * @todo TODO: Support `id` as an alternative to `handle` {@link https://shopify.dev/docs/api/storefront/2024-07/queries/collection}.
 *
 * @param options - The options for the collection.
 * @param options.api - The API to use.
 * @param options.handle - The handle of the collection to fetch.
 * @param [options.filters] - The filters to apply to the collection.
 * @returns The collection.
 * @throws {InvalidHandleError} When `handle` fails the validity check.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {NotFoundError} When no collection matches the handle.
 */
export const CollectionApi = async (
    { api, handle, ...props }: CollectionOptions,
    _cache?: unknown,
): Promise<Collection> => {
    if (!isValidHandle(handle)) {
        throw new InvalidHandleError(handle);
    }

    const shop = api.shop();

    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as CollectionFilters);
    const filtersTag = JSON.stringify(filters, null, 0);
    const { data, errors } = await api.query(
        COLLECTION_QUERY,
        {
            handle,
            ...extractLimitLikeFilters(filters),
            ...(({ sorting = 'COLLECTION_DEFAULT', before = null, after = null }) => ({
                sorting,
                before,
                after,
            }))(filters),
        },
        {
            tags: [
                ...cache.keys.collection({ tenant: api.shop(), handle }).tags,
                'collection',
                handle,
                ...(filtersTag ? [filtersTag] : []),
            ],
        },
    );

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    } else if (!data?.collection) {
        throw new NotFoundError(`"Collection" with the handle "${handle}" on shop "${shop.id}"`);
    }

    return {
        // hydrogen-react types `collection` as RecursivePartial<Collection>;
        // the Storefront API guarantees all queried fields are present.
        ...unsafe_cast<Collection>(data.collection),
        descriptionHtml: data.collection.descriptionHtml ?? '',
    };
};

/**
 * Fetches a lightweight list of all collections with product presence indicators.
 *
 * @param options - Options object.
 * @param options.api - Storefront API client.
 * @returns Array of collection stubs with `id`, `handle`, and `hasProducts`.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {NotFoundError} When the collections field is absent from the response.
 */
export const CollectionsApi = async ({
    api,
}: {
    api: AbstractApi;
}): Promise<
    Array<{
        id: string;
        handle: string;
        hasProducts: boolean;
    }>
> => {
    const { data, errors } = await api.query(COLLECTIONS_QUERY, undefined, {
        tags: [...cache.keys.collections({ tenant: api.shop() }).tags, 'collections'],
    });

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    } else if (!data?.collections) {
        throw new NotFoundError(`"Collections" cannot be found`);
    }

    return data.collections.edges.map(({ node: { id, handle, products } }) => ({
        id,
        handle,
        hasProducts: products.edges.length > 0,
    }));
};

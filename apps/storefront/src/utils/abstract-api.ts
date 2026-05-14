import type { ApolloClient, TypedDocumentNode } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client';

import { encodeSegment } from 'tagtree';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';

export type OmitTypeName<T> = Omit<T, '__typename'>;

export type ApiOptions = { api: AbstractApi };

export type AbstractApi<Q = TypedDocumentNode<unknown, unknown>> = {
    locale: () => Locale;
    shop: () => OnlineShop;
    query: <T>(
        query: Q,
        variables?: Record<string, string | number | boolean | object | Array<string | number | object> | null>,
        options?: {
            fetchPolicy?: RequestCache;
            tags?: string[];
            revalidate?: number;
        },
    ) => Promise<{ data: T | null; errors: readonly unknown[] | undefined }>;
};
export type AbstractApiBuilder<K, Q> = ({
    api,
    locale,
    shop,
}: {
    api: K;
    locale: Locale;
    shop: OnlineShop;
}) => AbstractApi<Q>;

export type AbstractShopifyApolloApiBuilder<Q> = AbstractApiBuilder<ApolloClient, Q>;

/**
 * Creates an AbstractApiBuilder for Shopify Apollo APIs.
 *
 * @todo Improve the type safety of all `AbstractApi` implementations.
 *
 * @param options - The api options.
 * @param options.api - The Apollo client to use.
 * @param options.locale - The locale to use.
 * @param options.shop - The shop to use.
 * @returns The AbstractApiBuilder.
 */
export const ApiBuilder: AbstractShopifyApolloApiBuilder<TypedDocumentNode<unknown, unknown>> = ({
    api,
    locale,
    shop,
}) => ({
    locale: () => locale,
    shop: () => shop,
    query: async <T>(
        query: TypedDocumentNode<unknown, unknown>,
        variables: Record<string, string | number | boolean | object | Array<string | number | object> | null> = {},
        {
            tags = [],
            revalidate = undefined,
            fetchPolicy = undefined,
        }: { fetchPolicy?: RequestCache; tags?: string[]; revalidate?: number } = {},
    ) => {
        // Tenant-root tags: ['shopify', 'shopify.<id>', 'shopify.<id>.<domain>'].
        // Caller-supplied `tags` are entity-specific (e.g., 'shopify.<id>.product.<handle>').
        const baseTags = [`shopify`, `shopify.${shop.id}`, `shopify.${shop.id}.${encodeSegment(shop.domain)}`];
        const allTags = [...baseTags, ...tags];

        const { data, error } = await api.query({
            query,
            //fetchPolicy,
            context: {
                fetchOptions: {
                    cache: fetchPolicy ?? 'no-store',
                    next: {
                        revalidate: revalidate ?? undefined,
                        tags: allTags,
                    },
                },
            },
            variables: {
                language: locale.language,
                country: locale.country,
                ...variables,
            },
        });

        // Apollo v4 unified errors → error. Re-expose the GraphQL error list to keep
        // callers (and the AbstractApi contract) unchanged.
        const errors = CombinedGraphQLErrors.is(error) ? error.errors : undefined;
        return { data: (data as T | undefined) || null, errors, error };
    },
});

export type ApiReturn<T> = [T, undefined] | [undefined, Error];

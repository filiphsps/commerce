import type { ApolloClient, TypedDocumentNode } from '@apollo/client';

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

export type AbstractShopifyApolloApiBuilder<Q> = AbstractApiBuilder<ApolloClient<unknown>, Q>;

export function buildCacheTagArray(shop: OnlineShop, locale: Locale, tags: string[]) {
    // TODO: change `shopify` tag based on the api we're using.
    return ['shopify', `shopify.${shop.id}`, shop.domain, locale.code, ...tags];
}

/**
 * Creates an AbstractApiBuilder for Shopify Apollo APIs.
 *
 * @todo TODO: Improve the type safety of all `AbstractApi` implementations.
 *
 * @param options - The api options.
 * @param options.api - The Apollo client to use.
 * @param options.locale - The locale to use.
 * @param options.shop - The locale to use.
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
        const { data, errors, error } = await api.query({
            query,
            //fetchPolicy,
            context: {
                fetchOptions: {
                    cache: fetchPolicy ?? 'no-store',
                    next: {
                        revalidate: revalidate ?? undefined,
                        tags: buildCacheTagArray(shop, locale, tags),
                    },
                },
            },
            variables: {
                language: locale.language,
                country: locale.country,
                ...variables,
            },
        });

        return { data: (data as T | undefined) || null, errors, error };
    },
});

export type ApiReturn<T> = [T, undefined] | [undefined, Error];

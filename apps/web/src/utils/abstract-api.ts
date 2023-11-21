/* eslint-disable unused-imports/no-unused-vars */
import type { Shop } from '@/api/shop';
import type { Locale } from '@/utils/locale';
import type { ApolloClient, DocumentNode, FetchPolicy, TypedDocumentNode } from '@apollo/client';

export type AbstractApi<Q = any> = {
    locale: () => Locale;
    shop: () => Shop;
    query: <T>(
        query: Q,
        variables?: Record<string, string | number | boolean | object | Array<string | number | object> | null>,
        options?: {
            tags?: string[];
            revalidate?: number;
        }
    ) => Promise<{ data: T | null; errors: readonly any[] | undefined }>;
};
export type AbstractApiBuilder<K, Q> = ({
    api,
    locale,
    shop,
    fetchPolicy
}: {
    api: K;
    locale: Locale;
    shop: Shop;
    fetchPolicy?: FetchPolicy;
}) => AbstractApi<Q>;

export type AbstractShopifyApolloApiBuilder<Q> = AbstractApiBuilder<ApolloClient<any>, Q>;

/**
 * Creates an AbstractApiBuilder for Shopify Apollo APIs.
 *
 * @param {object} options - The api options.
 * @param {ApolloClient<any>} options.api - The Apollo client to use.
 * @param {Locale} options.locale - The locale to use.
 * @param {FetchPolicy | undefined} options.fetchPolicy - The fetch policy to use.
 * @param {string[] | undefined} options.tags - The nextjs fetch tags to use.
 * @returns {AbstractApiBuilder} The AbstractApiBuilder.
 */
export const ShopifyApolloApiBuilder: AbstractShopifyApolloApiBuilder<DocumentNode | TypedDocumentNode<any, any>> = ({
    api,
    locale,
    shop,
    fetchPolicy = 'cache-first'
}) => ({
    locale: () => locale,
    shop: () => shop,
    query: async (query, variables = {}, { tags = [], revalidate = undefined } = {}) => {
        const { data, errors } = await api.query({
            query,
            fetchPolicy,
            context: {
                language: locale.country,
                locale: locale.country,
                fetchOptions: {
                    cache: revalidate ? undefined : 'force-cache',
                    next: {
                        revalidate,
                        tags: ['shopify', `shopify.${shop.id}`, ...tags]
                    }
                }
            },
            variables: {
                language: locale.language,
                country: locale.country,
                ...variables
            }
        });

        return { data: data || null, errors };
    }
});

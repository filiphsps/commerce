/* eslint-disable unused-imports/no-unused-vars */
import type { Locale } from '@/utils/locale';
import type { ApolloClient, DocumentNode, TypedDocumentNode } from '@apollo/client';

export type AbstractApi<Q = any> = {
    locale: () => Locale;
    query: <T>(
        query: Q,
        variables?: Record<string, string | number>
    ) => Promise<{ data: T | null; errors: readonly any[] | undefined }>;
};
export type AbstractApiBuilder<K, Q> = ({ locale, api }: { locale: Locale; api: K }) => AbstractApi<Q>;

export type AbstractShopifyApolloApiBuilder<Q> = AbstractApiBuilder<ApolloClient<any>, Q>;

/***
 * Creates an AbstractApiBuilder for Shopify Apollo APIs.
 *
 * @param {ApolloClient<any>} api - The Apollo client to use.
 * @param {Locale} locale - The locale to use.
 * @returns {AbstractApiBuilder} The AbstractApiBuilder.
 */
export const ShopifyApolloApiBuilder: AbstractShopifyApolloApiBuilder<DocumentNode | TypedDocumentNode<any, any>> = ({
    api,
    locale
}) => ({
    locale: () => locale,
    query: async (query, variables = {}) => {
        const { data, errors } = await api.query({
            query,
            variables: {
                language: locale.language,
                country: locale.country,
                ...variables
            }
        });

        return { data: data || null, errors };
    }
});

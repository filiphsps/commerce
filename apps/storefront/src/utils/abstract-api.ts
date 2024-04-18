/* eslint-disable unused-imports/no-unused-vars */
import type { Nullable, Shop } from '@nordcom/commerce-database';
import type { ShopBase } from '@nordcom/commerce-db';

import { DocumentTransform } from '@apollo/client';
import { visit } from 'graphql';

import type { Locale } from '@/utils/locale';
import type { ApolloClient, FetchPolicy, TypedDocumentNode } from '@apollo/client';

export type OmitTypeName<T> = Omit<T, '__typename'>;

export type ApiOptions = { api: AbstractApi };

export type AbstractApi<Q = any> = {
    locale: () => Locale;
    shop: () => Shop;
    query: <T>(
        query: Q,
        variables?: Record<string, string | number | boolean | object | Array<string | number | object> | null>,
        options?: {
            fetchPolicy?: FetchPolicy;
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

export function buildCacheTagArray(shop: Shop | ShopBase, locale: Locale, tags: string[], env?: string) {
    const prefix = env ? `${env}.` : '';

    return [
        ...(env ? [env] : []),
        ...tags.map((tag) => `${prefix}${tag}`),
        `${shop.id}${prefix.replace('.', '')}`,
        `${shop.id}.${locale.code}${prefix.replace('.', '')}`,
        ...tags.map((tag) => `${shop.id}.${locale.code}.${prefix}${tag}`)
    ];
}

/**
 * Creates an AbstractApiBuilder for Shopify Apollo APIs.
 *
 * @todo TODO: Improve the type safety of all `AbstractApi` implementations.
 *
 * @param {object} options - The api options.
 * @param {ApolloClient<any>} options.api - The Apollo client to use.
 * @param {Locale} options.locale - The locale to use.
 * @param {Shop} options.shop - The locale to use.
 * @param {FetchPolicy | undefined} options.fetchPolicy - The fetch policy to use.
 * @returns {AbstractApiBuilder} The AbstractApiBuilder.
 */
export const ApiBuilder: AbstractShopifyApolloApiBuilder<TypedDocumentNode<any, any>> = ({
    api,
    locale,
    shop,
    fetchPolicy = 'cache-first'
}) => ({
    locale: () => locale,
    shop: () => shop,
    query: async (query, variables = {}, { tags = [], revalidate = undefined, fetchPolicy = undefined } = {}) => {
        const { data, errors, error } = await api.query({
            query,
            fetchPolicy,
            context: {
                fetchOptions: {
                    cache: fetchPolicy || revalidate ? undefined : 'force-cache',
                    next: {
                        revalidate,
                        tags: buildCacheTagArray(shop, locale, tags, 'shopify')
                    }
                }
            },
            variables: {
                language: locale.language,
                country: locale.country,
                ...variables
            }
        });

        return { data: data || null, errors, error };
    }
});

/**
 * @todo TODO: This should be replaced with a generalized shopify parser.
 *       Preferably one that we can use to output in whatever format we want.
 */
export const cleanShopifyHtml = (html: string | unknown): Nullable<string> => {
    if (typeof html !== 'string' || !html) return null;
    let out = html as string;

    // Remove all non-breaking spaces and replace them with normal spaces.
    // TODO: This is a hacky solution. We should write a proper shopify parser.
    out = out.replaceAll(/ /g, ' ').replaceAll('\u00A0', ' ');

    // Replace some of the more common unicode characters with their HTML.
    out = out
        .replaceAll('”', '&rdquo;')
        .replaceAll('“', '&ldquo;')
        .replaceAll('‘', '&lsquo;')
        .replaceAll('’', '&rsquo;')
        .replaceAll('…', '&hellip;');

    // Trim the preceding and trailing whitespace.
    out = out.trim();

    return out;
};

/**
 * A GraphQL document transform that adds the `@inContext` directive to all queries.
 *
 * THIS IS (or at least seems to be) A REALLY HACKY SOLUTION. USE WITH CAUTION. :^)
 *
 * @todo TODO: This should be placed in a separate file or even a separate package.
 * @todo TODO: Need to add tests for this.
 * @todo TODO: This currently adds duplicate variables if they already exist.
 */
export const shopifyContextTransform = new DocumentTransform((document) => {
    // Add Shopify's `@inContext` directive to all queries.
    const transformedDocument = visit(document, {
        OperationDefinition(node) {
            return {
                ...node,
                variableDefinitions: [
                    ...(node.variableDefinitions || []),
                    {
                        kind: 'VariableDefinition',
                        variable: {
                            kind: 'Variable',
                            name: {
                                kind: 'Name',
                                value: 'country'
                            }
                        },
                        type: {
                            kind: 'NamedType',
                            name: {
                                kind: 'Name',
                                value: 'CountryCode'
                            }
                        }
                    },
                    {
                        kind: 'VariableDefinition',
                        variable: {
                            kind: 'Variable',
                            name: {
                                kind: 'Name',
                                value: 'language'
                            }
                        },
                        type: {
                            kind: 'NamedType',
                            name: {
                                kind: 'Name',
                                value: 'LanguageCode'
                            }
                        }
                    }
                ],
                directives: [
                    ...(node.directives || []),
                    {
                        kind: 'Directive',
                        name: {
                            kind: 'Name',
                            value: 'inContext'
                        },
                        arguments: [
                            {
                                kind: 'Argument',
                                name: {
                                    kind: 'Name',
                                    value: 'country'
                                },
                                value: {
                                    kind: 'Variable',
                                    name: {
                                        kind: 'Name',
                                        value: 'country'
                                    }
                                }
                            },
                            {
                                kind: 'Argument',
                                name: {
                                    kind: 'Name',
                                    value: 'language'
                                },
                                value: {
                                    kind: 'Variable',
                                    name: {
                                        kind: 'Name',
                                        value: 'language'
                                    }
                                }
                            }
                        ]
                    }
                ]
            };
        }
    });
    return transformedDocument;
});
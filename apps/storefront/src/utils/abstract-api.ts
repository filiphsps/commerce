/* eslint-disable unused-imports/no-unused-vars */
import type { Nullable, OnlineShop } from '@nordcom/commerce-db';

import { DocumentTransform } from '@apollo/client';
import { visit } from 'graphql';

import type { Locale } from '@/utils/locale';
import type { ApolloClient, TypedDocumentNode } from '@apollo/client';

export type OmitTypeName<T> = Omit<T, '__typename'>;

export type ApiOptions = { api: AbstractApi };

export type AbstractApi<Q = any> = {
    locale: () => Locale;
    shop: () => OnlineShop;
    query: <T>(
        query: Q,
        variables?: Record<string, string | number | boolean | object | Array<string | number | object> | null>,
        options?: {
            fetchPolicy?: RequestCache;
            tags?: string[];
            revalidate?: number;
        }
    ) => Promise<{ data: T | null; errors: readonly any[] | undefined }>;
};
export type AbstractApiBuilder<K, Q> = ({
    api,
    locale,
    shop
}: {
    api: K;
    locale: Locale;
    shop: OnlineShop;
}) => AbstractApi<Q>;

export type AbstractShopifyApolloApiBuilder<Q> = AbstractApiBuilder<ApolloClient<any>, Q>;

export function buildCacheTagArray(shop: OnlineShop, locale: Locale, tags: string[]) {
    // TODO: change `shopify` tag based on the api we're using.
    return ['shopify', `shopify.${shop.id}`, shop.domain, locale.code, ...tags];
}

/**
 * Creates an AbstractApiBuilder for Shopify Apollo APIs.
 *
 * @todo TODO: Improve the type safety of all `AbstractApi` implementations.
 *
 * @param {object} options - The api options.
 * @param {ApolloClient<any>} options.api - The Apollo client to use.
 * @param {Locale} options.locale - The locale to use.
 * @param {OnlineShop} options.shop - The locale to use.
 * @returns {AbstractApiBuilder} The AbstractApiBuilder.
 */
export const ApiBuilder: AbstractShopifyApolloApiBuilder<TypedDocumentNode<any, any>> = ({ api, locale, shop }) => ({
    locale: () => locale,
    shop: () => shop,
    query: async (query, variables = {}, { tags = [], revalidate = undefined, fetchPolicy = undefined } = {}) => {
        const { data, errors, error } = await api.query({
            query,
            //fetchPolicy,
            context: {
                fetchOptions: {
                    cache: fetchPolicy ?? 'no-cache',
                    next: {
                        revalidate: revalidate ?? undefined,
                        tags: buildCacheTagArray(shop, locale, tags)
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
    let out = (html as string) || '';

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

export type ApiReturn<T> = [T, undefined] | [undefined, Error];

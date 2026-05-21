import { initGraphQLTada } from 'gql.tada';

import type { introspection } from './graphql-env.d.ts';

/**
 * Typed GraphQL helper for the Shopify Storefront API.
 *
 * Drop-in replacement for Apollo's `gql` template tag — produces a
 * `TypedDocumentNode<TResult, TVariables>` whose types are inferred directly
 * from the query body against the bundled 2026-04 Storefront schema. Apollo's
 * `client.query(doc, vars)` then auto-infers both sides without any cast.
 *
 * ```ts
 * import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
 *
 * const PRODUCT = graphql(`
 *   query product($handle: String!) {
 *     product(handle: $handle) {
 *       id
 *       title
 *     }
 *   }
 * `);
 *
 * const { data } = await api.query(PRODUCT, { handle: 'foo' });
 * // data is typed as { product: { id: string; title: string } | null }
 * ```
 *
 * Regenerate the introspection after upgrading hydrogen-react or otherwise
 * changing the bundled schema:
 *
 *   pnpm --filter @nordcom/commerce-shopify-graphql graphql:gen
 */
export const graphql = initGraphQLTada<{
    introspection: introspection;
    scalars: {
        Color: string;
        DateTime: string;
        Decimal: string;
        HTML: string;
        JSON: unknown;
        Money: string;
        URL: string;
        UnsignedInt64: string;
    };
}>();

export type { FragmentOf, ResultOf, TadaDocumentNode, VariablesOf } from 'gql.tada';
export { maskFragments, readFragment } from 'gql.tada';

import type {
    FragmentOf as GqlFragmentOf,
    ResultOf as GqlResultOf,
    TadaDocumentNode as GqlTadaDocumentNode,
    VariablesOf as GqlVariablesOf,
} from 'gql.tada';
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

/**
 * Typed shape returned by an Apollo execution of a `graphql()` document.
 *
 * Reach for it to type the resolved `data` of a query or mutation in storefront
 * code, rather than manually spelling out the response shape.
 *
 * @template TDoc The `graphql()`-produced document type to extract the result from.
 *
 * @example
 * ```ts
 * import { graphql, ResultOf } from '@nordcom/commerce-shopify-graphql';
 *
 * const PRODUCT_QUERY = graphql(`
 *   query product($handle: String!) {
 *     product(handle: $handle) { id title }
 *   }
 * `);
 *
 * type ProductResult = ResultOf<typeof PRODUCT_QUERY>;
 * // { product: { id: string; title: string } | null }
 * ```
 */
export type ResultOf<TDoc> = GqlResultOf<TDoc>;

/**
 * Typed variables shape required to execute a given `graphql()` document.
 *
 * Use it to type the variables object passed to Apollo's `useQuery` or
 * `client.query` so argument mismatches are caught at compile time.
 *
 * @template TDoc The `graphql()`-produced document type to extract variables from.
 *
 * @example
 * ```ts
 * import { graphql, VariablesOf } from '@nordcom/commerce-shopify-graphql';
 *
 * const PRODUCT_QUERY = graphql(`
 *   query product($handle: String!) {
 *     product(handle: $handle) { id title }
 *   }
 * `);
 *
 * type ProductVars = VariablesOf<typeof PRODUCT_QUERY>;
 * // { handle: string }
 * ```
 */
export type VariablesOf<TDoc> = GqlVariablesOf<TDoc>;

// Structural equivalent of gql.tada's non-exported `FragmentDefDecorationLike` — needed to
// express a fragment-document constraint on FragmentOf without importing a private symbol.
type FragmentDecorationLike = { fragment: unknown; on: unknown; masked: unknown };

/**
 * Masked shape of a fragment as it appears before being unwrapped by `readFragment`.
 *
 * Use it to type the data parameter of a component that receives a masked fragment
 * spread, enforcing that callers pass the opaque reference rather than the unwrapped
 * result. Call `readFragment` inside the component to access the actual fields.
 *
 * @template TFragment The fragment document produced by `graphql()`. Must be a fragment
 *   document (created with a `fragment ... on ...` body) rather than a query or mutation.
 *
 * @example
 * ```ts
 * import { graphql, FragmentOf, readFragment } from '@nordcom/commerce-shopify-graphql';
 *
 * const PRODUCT_FRAGMENT = graphql(`
 *   fragment ProductFields on Product { id title }
 * `);
 *
 * type Product = FragmentOf<typeof PRODUCT_FRAGMENT>;
 *
 * function render(data: Product) {
 *   const product = readFragment(PRODUCT_FRAGMENT, data);
 * }
 * ```
 */
export type FragmentOf<TFragment extends GqlTadaDocumentNode<unknown, unknown, FragmentDecorationLike>> =
    TFragment extends GqlTadaDocumentNode<unknown, unknown, FragmentDecorationLike> ? GqlFragmentOf<TFragment> : never;

/**
 * Document node type that carries both result and variables type parameters end-to-end.
 *
 * Use it to type function parameters that accept any `graphql()`-produced document,
 * preserving full type inference for both the result and variables at the call site.
 *
 * @template TResult The GraphQL result shape.
 * @template TVariables The GraphQL variables shape.
 * @template TDecoration Internal decoration attached by gql.tada; defaults to `void`.
 *
 * @example
 * ```ts
 * import { TadaDocumentNode } from '@nordcom/commerce-shopify-graphql';
 *
 * function execute<TResult, TVariables>(
 *   doc: TadaDocumentNode<TResult, TVariables>,
 *   vars: TVariables
 * ): Promise<TResult> {
 *   return client.query(doc, vars).then(({ data }) => data);
 * }
 * ```
 */
export type TadaDocumentNode<
    TResult = Record<string, unknown>,
    TVariables = Record<string, unknown>,
    TDecoration = void,
> = GqlTadaDocumentNode<TResult, TVariables, TDecoration>;

export { maskFragments, readFragment } from 'gql.tada';

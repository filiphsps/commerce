import type { ApolloClient, TypedDocumentNode } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client';
import type { OnlineShop } from '@nordcom/commerce-db';
import { encodeSegment } from '@tagtree/core';
import type { Locale } from '@/utils/locale';

export type OmitTypeName<T> = Omit<T, '__typename'>;

/**
 * Default Data Cache lifetime, in seconds, for cacheable Storefront reads (8h).
 * Mirrors the HttpLink-level `fetchOptions.next.revalidate` in `api/client.ts`:
 * because Apollo shallow-merges the per-query `context.fetchOptions` over the
 * link config, any `next` set per query REPLACES the link's wholesale, so the
 * floor has to be re-supplied here too or it silently disappears.
 */
const STOREFRONT_REVALIDATE_SECONDS = 28_800;

export type ApiOptions = { api: AbstractApi };

type QueryVariables = Record<string, string | number | boolean | object | Array<string | number | object> | null>;

export type AbstractApi<Q = TypedDocumentNode<unknown, unknown>> = {
    locale: () => Locale;
    shop: () => OnlineShop;
    /**
     * Run a Storefront query. When the document is a typed
     * `TypedDocumentNode<TResult, TVariables>` (e.g. from
     * `@nordcom/commerce-shopify-graphql`'s `graphql()`), both `data` and
     * `variables` are inferred from the document — no explicit generic
     * needed. The explicit `<T>` form is kept for callers that still cast
     * an untyped `gql` result.
     */
    query: {
        <TResult, TVariables extends QueryVariables = QueryVariables>(
            query: TypedDocumentNode<TResult, TVariables>,
            variables?: TVariables,
            options?: {
                fetchPolicy?: RequestCache;
                tags?: string[];
                revalidate?: number;
            },
        ): Promise<{ data: TResult | null; errors: readonly unknown[] | undefined }>;
        <T>(
            query: Q,
            variables?: QueryVariables,
            options?: {
                fetchPolicy?: RequestCache;
                tags?: string[];
                revalidate?: number;
            },
        ): Promise<{ data: T | null; errors: readonly unknown[] | undefined }>;
    };
    /**
     * Run a Storefront mutation. Mirrors {@link query}'s typed/untyped
     * overloads. Mutations are always uncached (`fetchPolicy: 'no-cache'`);
     * `tags` is accepted for API symmetry but is a no-op — cache
     * invalidation for mutations belongs in server actions via
     * `revalidateTag()`.
     */
    mutate: {
        <TResult, TVariables extends QueryVariables = QueryVariables>(
            mutation: TypedDocumentNode<TResult, TVariables>,
            variables?: TVariables,
            options?: {
                fetchPolicy?: RequestCache;
                tags?: string[];
            },
        ): Promise<{ data: TResult | null; errors: readonly unknown[] | undefined }>;
        <T>(
            mutation: Q,
            variables?: QueryVariables,
            options?: {
                fetchPolicy?: RequestCache;
                tags?: string[];
            },
        ): Promise<{ data: T | null; errors: readonly unknown[] | undefined }>;
    };
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

        // Default to a CACHED policy. The previous `cache: fetchPolicy ?? 'no-store'`
        // forced `cache: 'no-store'` on every query that didn't opt out, which
        // overrides the HttpLink revalidate floor (api/client.ts) and made every
        // Storefront read uncached at the fetch layer — route handlers (sitemaps,
        // robots, icons) and any non-`'use cache'` path hit Shopify on every request.
        //
        // Correctness is preserved by tag-based webhook invalidation
        // (revalidateTag / evictApolloClient): cached reads carry `allTags`, so a
        // product/collection/page webhook still evicts them on demand.
        //
        // Omitting `cache` lets `next.revalidate` + `next.tags` govern. Genuinely
        // dynamic reads (cart, customer, checkout) pass `fetchPolicy: 'no-store'`
        // explicitly; Next.js forbids pairing `cache: 'no-store'` with
        // `next.revalidate`, so the revalidate floor is dropped on that path.
        const dynamic = fetchPolicy === 'no-store';
        const { data, error } = await api.query({
            query,
            // Dynamic (per-buyer) reads must bypass Apollo's `InMemoryCache` too,
            // not only Next's Data Cache. The Apollo client is pooled across
            // requests (api/_apollo-pool.ts) and defaults to `cache-first`
            // (api/client.ts), so a `getCart(cartId)` could otherwise be served
            // from a stale normalized entry with no network round-trip — the
            // `cache: 'no-store'` below only governs the Next layer. `no-cache`
            // fetches fresh and never reads or writes the normalized cache.
            ...(dynamic ? { fetchPolicy: 'no-cache' as const } : {}),
            context: {
                fetchOptions: {
                    ...(fetchPolicy ? { cache: fetchPolicy } : {}),
                    next: dynamic
                        ? { tags: allTags }
                        : { revalidate: revalidate ?? STOREFRONT_REVALIDATE_SECONDS, tags: allTags },
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
    mutate: async <T>(
        mutation: TypedDocumentNode<unknown, unknown>,
        variables: Record<string, string | number | boolean | object | Array<string | number | object> | null> = {},
        _options: { fetchPolicy?: RequestCache; tags?: string[] } = {},
    ): Promise<{ data: T | null; errors: readonly unknown[] | undefined }> => {
        // `fetchPolicy`/`tags` accepted for API symmetry with `query()` but
        // ignored — Apollo doesn't cache mutations, and any cached-read
        // invalidation belongs in server actions via `revalidateTag()`.
        try {
            const { data, error } = await api.mutate({
                mutation,
                context: {
                    fetchOptions: {
                        cache: 'no-store',
                        // Override the Apollo HttpLink default
                        // `next: { revalidate: 28800 }` — without this, the
                        // per-request `cache: 'no-store'` and the link-level
                        // `revalidate` both reach Next.js fetch and trip its
                        // "only one should be specified" warning.
                        next: {},
                    },
                },
                variables: {
                    language: locale.language,
                    country: locale.country,
                    ...variables,
                },
            });

            const errors = CombinedGraphQLErrors.is(error) ? error.errors : undefined;
            return { data: (data as T | undefined) ?? null, errors };
        } catch (error) {
            if (CombinedGraphQLErrors.is(error)) {
                return { data: null, errors: error.errors };
            }
            throw error;
        }
    },
});

export type ApiReturn<T> = [T, undefined] | [undefined, Error];

import type { AdapterCtx } from '@nordcom/cart-core';

/**
 * Abstraction over the Shopify Storefront GraphQL transport so the adapter
 * stays free of any concrete client (Apollo, `fetch`, mock). The host wires
 * tenant + locale resolution into `query` / `mutate`; the adapter only sees
 * documents and variables.
 */
export interface ShopifyTransport {
    /**
     * Executes a GraphQL read against the Shopify Storefront API.
     *
     * @param doc - gql.tada-compiled query document.
     * @param vars - Variables matching the document's `$args`.
     * @param ctx - Adapter context; the transport reads `shop` + `locale` from
     *   it to scope the request to the right tenant.
     * @returns `{ data }` envelope; `data` is `null` when the query resolved
     *   without a result (e.g. cart not found).
     */
    query<T = unknown>(doc: unknown, vars: Record<string, unknown>, ctx: AdapterCtx): Promise<{ data: T | null }>;

    /**
     * Executes a GraphQL mutation against the Shopify Storefront API.
     *
     * @param doc - gql.tada-compiled mutation document.
     * @param vars - Variables matching the document's `$args`.
     * @param ctx - Adapter context; the transport reads `shop` + `locale` from
     *   it to scope the request to the right tenant.
     * @returns `{ data }` envelope; `data` is `null` when the mutation failed
     *   below the GraphQL layer.
     */
    mutate<T = unknown>(doc: unknown, vars: Record<string, unknown>, ctx: AdapterCtx): Promise<{ data: T | null }>;
}

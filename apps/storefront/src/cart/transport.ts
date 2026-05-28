import 'server-only';

import type { AdapterCtx } from '@nordcom/cart-core';
import type { ShopifyTransport } from '@nordcom/cart-shopify';
import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownLocaleError } from '@nordcom/commerce-errors';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { Locale } from '@/utils/locale';

type ShopifyApiClient = Awaited<ReturnType<typeof ShopifyApolloApiClient>>;

const clientCache = new Map<string, ShopifyApiClient>();

/**
 * Memoize a {@link ShopifyApolloApiClient} per `(shop.id, locale)` so a single
 * server request reuses one Apollo client across every adapter call.
 *
 * @param ctx - The cart adapter context carrying the tenant + locale.
 * @returns A configured Shopify Apollo API client.
 * @throws {UnknownLocaleError} When `ctx.locale` does not parse to a valid Storefront locale.
 */
async function client(ctx: AdapterCtx): Promise<ShopifyApiClient> {
    const shop = ctx.shop as OnlineShop;
    const localeCode = ctx.locale.country ? `${ctx.locale.language}-${ctx.locale.country}` : ctx.locale.language;
    const key = `${shop.id}:${localeCode}`;
    const cached = clientCache.get(key);
    if (cached) return cached;
    const locale = Locale.from(localeCode);
    if (!locale) throw new UnknownLocaleError(localeCode);
    const api = await ShopifyApolloApiClient({ shop, locale });
    clientCache.set(key, api);
    return api;
}

type RawClient = {
    query: (
        q: unknown,
        v: Record<string, unknown>,
        options?: { fetchPolicy?: RequestCache },
    ) => Promise<{ data: unknown }>;
    mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: unknown }>;
};

export const shopifyTransport: ShopifyTransport = {
    async query(doc, vars, ctx) {
        const c = (await client(ctx)) as unknown as RawClient;
        // The only cart query is `getCart` — per-buyer state that must never be
        // served from the Data Cache. Opt out explicitly: the abstract API now
        // defaults to a cached policy, so cart reads have to ask for `no-store`.
        return c.query(doc, vars, { fetchPolicy: 'no-store' }) as never;
    },
    async mutate(doc, vars, ctx) {
        const c = (await client(ctx)) as unknown as RawClient;
        return c.mutate(doc, vars) as never;
    },
};

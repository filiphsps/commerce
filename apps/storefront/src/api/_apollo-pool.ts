import 'server-only';

import type { ApolloClient } from '@apollo/client';
import type { OnlineShop } from '@nordcom/commerce-db';
import { trace } from '@opentelemetry/api';
import type { Locale } from '@/utils/locale';

const POOL_WARN_THRESHOLD = 1000;

// Module-level pool keyed by `${shop.id}::${locale.code}`. The Apollo
// InMemoryCache lives inside each entry and survives across requests —
// invalidation goes through evictApolloClient() called from the webhook
// revalidate handler.
const pool = new Map<string, ApolloClient>();

/**
 * Builds the pool lookup key for a shop + locale pair.
 *
 * @param shopId - Unique shop identifier from the `OnlineShop` record.
 * @param localeCode - BCP-47 locale code, e.g. `"en-US"`.
 * @returns Composite key string `"<shopId>::<localeCode>"`.
 */
const key = (shopId: string, localeCode: string) => `${shopId}::${localeCode}`;

/**
 * Returns the pooled Apollo client for the given shop + locale, creating one via `factory` on first call.
 *
 * @param options - Pool lookup options.
 * @param options.shop - Shop identity used as part of the pool key.
 * @param options.locale - Locale used as part of the pool key.
 * @param options.factory - Called once to create the client when no cached entry exists.
 * @returns The existing or newly created Apollo client.
 */
export function getApolloClient({
    shop,
    locale,
    factory,
}: {
    shop: Pick<OnlineShop, 'id' | 'domain'>;
    locale: Pick<Locale, 'code'>;
    factory: () => ApolloClient;
}): ApolloClient {
    const k = key(shop.id, locale.code);
    const existing = pool.get(k);
    if (existing) return existing;

    const client = factory();
    pool.set(k, client);
    if (pool.size > POOL_WARN_THRESHOLD) {
        trace.getActiveSpan()?.addEvent('apollo_pool.size_threshold_exceeded', {
            'pool.size': pool.size,
            'pool.threshold': POOL_WARN_THRESHOLD,
        });
    }
    return client;
}

/**
 * Removes all Apollo clients for a shop from the pool — called from the webhook revalidate handler.
 *
 * @param options - Eviction options.
 * @param options.shopId - Identifier of the shop whose entries should be removed.
 */
export function evictApolloClient({ shopId }: { shopId: string }): void {
    for (const k of pool.keys()) {
        if (k.startsWith(`${shopId}::`)) pool.delete(k);
    }
}

/**
 * Clears every entry in the Apollo client pool.
 */
export function evictAllApolloClients(): void {
    pool.clear();
}

/**
 * Returns the current number of entries in the Apollo client pool.
 *
 * @returns Count of active pool entries.
 */
export const _poolSize = () => pool.size;

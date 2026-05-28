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
//
// Entries hold the *promise* the factory returns (not the resolved client) so
// the cost the factory pays on a miss — the `Shop.findByDomain` DB round-trip
// plus Hydrogen client construction — happens exactly once even when several
// requests race to populate the same key.
const pool = new Map<string, ApolloClient | Promise<ApolloClient>>();

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
 * On a pool hit the cached entry is returned without ever invoking `factory`,
 * so any per-call cost the factory carries (config resolution, the
 * `Shop.findByDomain` DB round-trip, Hydrogen client construction) is skipped
 * entirely. The factory may be async; its promise is cached so concurrent
 * misses for the same key share one creation.
 *
 * @param options - Pool lookup options.
 * @param options.shop - Shop identity used as part of the pool key.
 * @param options.locale - Locale used as part of the pool key.
 * @param options.factory - Called once to create the client when no cached entry exists; sync or async.
 * @returns The existing or newly created Apollo client (a promise when the factory is async).
 */
export function getApolloClient({
    shop,
    locale,
    factory,
}: {
    shop: Pick<OnlineShop, 'id' | 'domain'>;
    locale: Pick<Locale, 'code'>;
    factory: () => ApolloClient | Promise<ApolloClient>;
}): ApolloClient | Promise<ApolloClient> {
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
    // A rejected factory promise (e.g. ShopMisconfigurationError) must not stick
    // in the pool, or every later request for this key would replay the failure
    // instead of retrying once the shop is fixed.
    if (client instanceof Promise) {
        client.catch(() => {
            if (pool.get(k) === client) pool.delete(k);
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

import 'server-only';

import type { ApolloClient } from '@apollo/client';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';

const POOL_WARN_THRESHOLD = 1000;

// Module-level pool keyed by `${shop.id}::${locale.code}`. The Apollo
// InMemoryCache lives inside each entry and survives across requests —
// invalidation goes through evictApolloClient() called from the webhook
// revalidate handler.
const pool = new Map<string, ApolloClient>();

const key = (shopId: string, localeCode: string) => `${shopId}::${localeCode}`;

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
        console.warn(`[apollo-pool] size exceeds ${POOL_WARN_THRESHOLD}; potential leak. current=${pool.size}`);
    }
    return client;
}

export function evictApolloClient({ shopId }: { shopId: string }): void {
    for (const k of pool.keys()) {
        if (k.startsWith(`${shopId}::`)) pool.delete(k);
    }
}

export function evictAllApolloClients(): void {
    pool.clear();
}

export const _poolSize = () => pool.size;

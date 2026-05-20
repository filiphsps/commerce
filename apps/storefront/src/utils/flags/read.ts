import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';

import { type EvaluateShopFlagOptions, evaluateShopFlag } from './evaluate';
import { getFlagOverrides } from './overrides';

/**
 * Reads a feature flag for `shop` with request-scoped overrides applied.
 *
 * Fetches the Vercel Toolbar override cookie via `getFlagOverrides()` and
 * threads it into `evaluateShopFlag`. **Only safe to call outside `'use cache'`
 * scopes** — internally calls `await cookies()`, which throws inside cached
 * components. From a cached component, wrap the caller in a `<Suspense>`
 * boundary so it becomes a dynamic subtree.
 *
 * For cache-safe evaluation with pre-fetched overrides, call `evaluateShopFlag`
 * directly.
 */
export async function readFlag<T>(
    shop: OnlineShop,
    key: string,
    options: Omit<EvaluateShopFlagOptions<T>, 'overrides'> = {},
): Promise<T> {
    const overrides = await getFlagOverrides();
    return evaluateShopFlag<T>(shop, key, { ...options, overrides });
}

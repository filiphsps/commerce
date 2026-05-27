import 'server-only';

import type { AdapterCtx } from '@nordcom/cart-core';
import { CartProviderError, consoleLogger } from '@nordcom/cart-core';
import type { OnlineShop } from '@nordcom/commerce-db';
import { getRequestContext } from '@/utils/request-context';

/**
 * Bridge the storefront's per-request `{shop, locale}` lookup into the
 * {@link AdapterCtx} shape every cart-core call expects. Threads an optional
 * idempotency key so the kernel's idempotency middleware can dedup retries
 * across server-action submissions.
 *
 * @param opts.idempotencyKey - Per-mutation key supplied by the typed-action
 *   factory. Forwarded onto the returned context.
 * @returns Adapter context tagged with the current tenant + locale.
 * @throws {CartProviderError} When the storefront cannot determine the shop +
 *   locale for the current request (e.g. middleware did not run).
 */
export async function resolveContext(opts?: { idempotencyKey?: string }): Promise<AdapterCtx<OnlineShop>> {
    const ctx = await getRequestContext();
    if (!ctx) {
        throw new CartProviderError('Storefront cart cannot resolve {shop, locale} from request context');
    }
    return {
        shop: ctx.shop,
        locale: {
            language: ctx.locale.language,
            country: ctx.locale.country ?? 'US',
            currency: 'USD',
        },
        idempotencyKey: opts?.idempotencyKey,
        logger: consoleLogger,
    };
}

import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';
import { trace } from '@opentelemetry/api';
import { cacheLife, cacheTag } from 'next/cache';
import { headers } from 'next/headers';
import { cache } from 'react';
import { Shop } from '@/api/_shop-loader';
import { tenantRootTags } from '@/cache';
import { Locale } from '@/utils/locale';

export type RequestContext = { shop: OnlineShop; locale: ReturnType<typeof Locale.from> };

/**
 * Resolves a tenant's shop document (with feature flags populated) keyed on the primitive
 * `domain`, cached at `max` and tagged with the tenant-root tags so admin edits evict it.
 *
 * `getRequestContext` runs on every request; calling `Shop.findByDomain` directly would issue an
 * uncached Convex HTTP read (`db/shops:byDomain` through the `packages/db` server-trust seam)
 * each time. Wrapping it in `'use cache'` collapses that to one lookup per tenant, makes the read
 * part of cache creation (the SFREAD-11 boundary for this seam), and `tenantRootTags(shop)` keeps
 * it fresh.
 *
 * @param domain - The tenant hostname to resolve.
 * @returns The matched shop as `OnlineShop`.
 * @throws {UnknownShopDomainError} When no shop claims the domain.
 */
async function resolveTenantShop(domain: string): Promise<OnlineShop> {
    'use cache';
    cacheLife('max');

    const shop = (await Shop.findByDomain(domain, {
        convert: true,
        populate: ['featureFlags.flag'],
    })) as OnlineShop;
    cacheTag(...tenantRootTags(shop));
    return shop;
}

/**
 * Resolves the active shop and locale for the current request from `x-shop-domain` and `x-locale` middleware headers.
 *
 * @returns The request context containing `shop` and `locale` when the headers are present and the shop is found, or `null` for unauthenticated or test requests.
 */
export const getRequestContext = cache(async (): Promise<RequestContext | null> => {
    try {
        const h = await headers();
        const domain = h.get('x-shop-domain');
        const localeCode = h.get('x-locale');
        if (!domain || !localeCode) return null;

        const shop = await resolveTenantShop(domain);
        const locale = Locale.from(localeCode);
        if (!shop || !locale) return null;

        return { shop: shop as OnlineShop, locale };
    } catch (error) {
        // Suppress during tests where headers() is unavailable.
        if (process.env.NODE_ENV !== 'test') {
            trace.getActiveSpan()?.addEvent('request_context.lookup_failed', {
                'error.message': (error as Error)?.message ?? String(error),
            });
        }
        return null;
    }
});

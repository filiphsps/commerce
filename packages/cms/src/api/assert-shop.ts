import 'server-only';
import type { ShopRef } from './get-page';

/**
 * Defensive guard for tenant-scoped CMS queries. Every helper in this module
 * filters by `tenant: { equals: shop.id }` — but if `shop.id` is somehow
 * empty (a misconfigured Shop document, a test harness, a malformed call
 * site), MongoDB's `equals: ''` resolves to "no match" — which is fine —
 * while `equals: undefined` would silently drop the predicate and return
 * cross-tenant docs. Throw at the boundary so the call site fails fast
 * instead of leaking another tenant's content.
 */
export const assertShopId = (shop: ShopRef): void => {
    if (!shop || typeof shop.id !== 'string' || shop.id.length === 0) {
        throw new Error('[cms] tenant-scoped query received empty shop.id — refusing to broaden the predicate');
    }
};

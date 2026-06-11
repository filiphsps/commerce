import 'server-only';

import { cache } from 'react';

/**
 * Request-scoped slot for the operator's ACTIVE tenant selection — the shop-switcher seam between
 * the `[domain]` route context and the per-call Convex token mint.
 *
 * React's `cache()` memoizes per server request (an RSC render or one server-action invocation), so
 * the slot written while `getAuthedCmsCtx` resolves the route's domain is visible to every later
 * read in the SAME request — and structurally cannot leak across concurrent requests, which matters
 * because a stale selection minted into another operator's token would mis-scope their writes
 * (Convex re-verifies membership, so it could never cross tenants the operator lacks, but it could
 * still pick the wrong one of their own).
 *
 * Outside a request scope `cache()` degrades to no memoization: the selection then always reads as
 * absent and token minting falls back to the claim-less single-membership path — fail-safe, never
 * fail-wrong.
 *
 * @returns The request's mutable selection slot.
 */
const activeShopHolder = cache((): { current: string | undefined } => ({ current: undefined }));

/**
 * Records the request's active-shop selection — the route-resolved shop's external id
 * (`shops.legacyId`, the public `OnlineShop.id`). `getAuthedCmsCtx` calls this with the resolved
 * tenant's id, or `undefined` on cross-tenant routes so no selection is minted there.
 *
 * @param shopId - The active shop's external id, or `undefined` to clear the selection.
 */
export function setActiveShopSelection(shopId: string | undefined): void {
    activeShopHolder().current = shopId;
}

/**
 * Reads the request's active-shop selection for the operator token mint.
 *
 * @returns The active shop's external id, or `undefined` when the request carries no selection.
 */
export function getActiveShopSelection(): string | undefined {
    return activeShopHolder().current;
}

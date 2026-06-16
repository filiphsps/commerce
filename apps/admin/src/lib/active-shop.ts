import 'server-only';

import { cache } from 'react';

/**
 * Request-scoped slot for the operator's ACTIVE tenant — the routed `/[domain]/` hostname, the seam
 * between the App Router's tenant segment and the per-call tenant Convex request. It holds the ROUTED
 * DOMAIN (a plain string), NOT a minted JWT claim: a Clerk `org_id` cannot identify the shop because
 * one org owns many shops, so the routed domain is what disambiguates a multi-org/multi-shop operator.
 * The domain rides as the reserved `shopDomain` arg the admin's tenant-call wrappers inject and the
 * Convex tenant constructor consumes (`resolveShopAccess`), which re-checks the operator's owning-org
 * membership — so even a wrong domain in this slot can never reach a tenant the operator's org lacks.
 *
 * React's `cache()` memoizes per server request (an RSC render or one server-action invocation), so the
 * domain written while `getAuthedCmsCtx` resolves the route is visible to every later tenant call in the
 * SAME request — and structurally cannot leak across concurrent requests, which matters because a stale
 * domain would mis-scope another operator's reads/writes (Convex re-verifies membership, so it could
 * never cross orgs the operator lacks, but it could still pick the wrong one of their own shops).
 *
 * Outside a request scope `cache()` degrades to no memoization: the domain then always reads as absent
 * and the tenant calls fall back to the selector-less lone-membership path — fail-safe, never
 * fail-wrong.
 *
 * @returns The request's mutable active-domain slot.
 */
const activeShopDomainHolder = cache((): { current: string | undefined } => ({ current: undefined }));

/**
 * Records the request's active shop as its routed `/[domain]/` hostname. `getAuthedCmsCtx` calls this
 * with the resolved tenant's domain, or `undefined` on cross-tenant admin routes so no selector is
 * injected there (those calls keep falling back to the lone-membership resolution).
 *
 * @param domain - The active shop's routed hostname, or `undefined` to clear the selection.
 */
export function setActiveShopDomain(domain: string | undefined): void {
    activeShopDomainHolder().current = domain;
}

/**
 * Reads the request's active shop domain for the tenant-call wrappers to inject as `shopDomain`.
 *
 * @returns The active shop's routed hostname, or `undefined` when the request carries no routed tenant.
 */
export function getActiveShopDomain(): string | undefined {
    return activeShopDomainHolder().current;
}

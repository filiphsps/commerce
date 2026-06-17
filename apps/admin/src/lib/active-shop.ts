import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped carrier for the operator's ACTIVE tenant — the routed `/[domain]/` hostname, the seam
 * between the App Router's tenant segment and the per-call tenant Convex request. It holds the ROUTED
 * DOMAIN (a plain string), NOT a minted JWT claim: a Clerk `org_id` cannot identify the shop because
 * one org owns many shops, so the routed domain is what disambiguates a multi-org/multi-shop operator.
 * The domain rides as the reserved `shopDomain` arg the admin's tenant-call wrappers inject and the
 * Convex tenant constructor consumes (`resolveShopAccess`), which re-checks the operator's owning-org
 * membership — so even a wrong domain in this slot can never reach a tenant the operator's org lacks.
 *
 * Backed by `AsyncLocalStorage`, NOT React's `cache()`. `cache()` only memoizes inside a React render
 * pass, so a Server Action — the editor autosave / publish path, which runs OUTSIDE any render — read
 * the slot back as a fresh empty holder and silently fell through to the selector-less lone-membership
 * resolution; for a multi-shop operator that fallback throws `AMBIGUOUS_SHOP_MEMBERSHIP`. The async
 * store propagates through both renders AND Server Actions for the lifetime of the request's async
 * context, fixing the dropped selector.
 *
 * Isolation is per request because the runtime dispatches each request/Server-Action in its own async
 * context, and {@link setActiveShopDomain} runs UNCONDITIONALLY at the head of every tenant request
 * (`getAuthedCmsCtx` sets it — to the routed domain, or to `undefined` on a cross-tenant route) before
 * any tenant Convex call. So even if the runtime were to reuse an async context, the slot is always
 * re-stamped for the current request before it is read — a previous request's value can never leak
 * forward. A read with no store established (no domain set in this context) returns `undefined`, and
 * the tenant calls fall back to the selector-less lone-membership path — fail-safe, never fail-wrong.
 */
const activeShopDomainStorage = new AsyncLocalStorage<{ current: string | undefined }>();

/**
 * Records the request's active shop as its routed `/[domain]/` hostname. `getAuthedCmsCtx` calls this
 * with the resolved tenant's domain, or `undefined` on cross-tenant admin routes so no selector is
 * injected there (those calls keep falling back to the lone-membership resolution).
 *
 * Establishes the request's store on first write via `enterWith` — required (rather than `run`) because
 * the value is set partway through a request and must persist for the remainder of that request, which
 * has no single callback the slot could wrap.
 *
 * @param domain - The active shop's routed hostname, or `undefined` to clear the selection.
 */
export function setActiveShopDomain(domain: string | undefined): void {
    const store = activeShopDomainStorage.getStore();
    if (store) {
        store.current = domain;
        return;
    }
    activeShopDomainStorage.enterWith({ current: domain });
}

/**
 * Reads the request's active shop domain for the tenant-call wrappers to inject as `shopDomain`.
 *
 * @returns The active shop's routed hostname, or `undefined` when the request carries no routed tenant.
 */
export function getActiveShopDomain(): string | undefined {
    return activeShopDomainStorage.getStore()?.current;
}

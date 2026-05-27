# JSDoc Retrofit — Wave Log

Append one section per wave as it completes. Use this as the orchestrator's running state.

---

## Wave 1 — Foundations (errors + utils)

Status: completed (merged by human ahead of review-loop closure)
Started: 2026-05-27
Completed: 2026-05-27
PRs:
- `packages/errors`: https://github.com/filiphsps/commerce/pull/1950 — merged as commit `4144e0f77`. Generator counts: 53 Tier-1, 1 Tier-2, 2 files. Reviewer flagged 9 blockers AFTER merge (see Calibration findings).
- `packages/utils`: https://github.com/filiphsps/commerce/pull/1949 — merged as commit `3a168fbe2`. Generator counts: 3 Tier-1, 0 Tier-2, 2 files. Reviewer flagged 1 blocker AFTER merge.
Calibration findings:
- **Public methods on Tier-1 classes were under-documented.** Errors PR landed without `@example` on `Error.is()`, `Error.isError()`, `Error.isNotFound()`, `ProviderFetchError.stringifyInput()`. Folded into spec § Edge case rules: methods inherit Tier 1.
- **Type-guard `@param` descriptions defaulted to "the value to test".** Folded into spec § Edge case rules: guards need semantic descriptions.
- **Tier-1 type aliases restated the type expression.** Folded into spec § Edge case rules: alias purpose must add caller-facing meaning.
- **One `@example` referenced a non-existent error kind (`CartErrorKind.CART_FULL`).** Folded into spec § Edge case rules: examples must reference real symbols.
- **Generator count discrepancies.** Reported 53 Tier-1 vs reviewer counted 55 — bookkeeping gap (likely class methods counted inconsistently), not missing docs. No spec change; future generators should count methods as separate symbols.
- **Follow-up PRs opened and reviewed clean:**
  - `packages/errors`: https://github.com/filiphsps/commerce/pull/1952 — addresses all 9 blockers. Reviewer LGTM.
  - `packages/utils`: https://github.com/filiphsps/commerce/pull/1951 — addresses the 1 blocker. Reviewer LGTM.
  - Both await human merge before Wave 2 starts.

## Wave 2 — Independent foundations (db, tagtree subs, shopify-graphql, cart/core)

Status: in_progress
Started: 2026-05-27
Completed: —
PRs:
- `packages/db`: pending generator dispatch
- `packages/tagtree/core`: pending generator dispatch
- `packages/tagtree/next`: pending generator dispatch
- `packages/tagtree/payload`: pending generator dispatch
- `packages/tagtree/shopify`: pending generator dispatch
- `packages/shopify-graphql`: pending generator dispatch
- `packages/cart/core`: pending generator dispatch
Calibration findings: —

## Wave 3 — Dependent packages (shopify-html, marketing-common, test-mongo, cart/shopify, cart/react)

Status: pending
Started: —
Completed: —
PRs:
- `packages/shopify-html`: —
- `packages/marketing-common`: —
- `packages/test-mongo`: —
- `packages/cart/shopify`: —
- `packages/cart/react`: —
Calibration findings: —

## Wave 4 — Large packages (cart/next, cms)

Status: pending
Started: —
Completed: —
PRs:
- `packages/cart/next`: —
- `packages/cms`: —
Calibration findings: —

## Wave 5 — Apps (admin, storefront)

Status: pending
Started: —
Completed: —
PRs:
- `apps/admin`: —
- `apps/storefront`: —
Calibration findings: —

## Wave 6 — Final (landing)

Status: pending
Started: —
Completed: —
PRs:
- `apps/landing`: —
Calibration findings: —

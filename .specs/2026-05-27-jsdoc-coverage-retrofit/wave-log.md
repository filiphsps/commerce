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

Status: completed
Started: 2026-05-27
Completed: 2026-05-27
PRs:
- `packages/db`: #1957 merged. 34 T1, 10 T2, 13 files.
- `packages/tagtree/core`: #1958 merged. 34 T1, 2 T2, 11 files.
- `packages/tagtree/next`: #1956 merged (LGTM clean). 1 T1, 0 T2, 1 file.
- `packages/tagtree/payload`: #1954 merged (LGTM clean). 2 T1, 2 T2, 1 file.
- `packages/tagtree/shopify`: #1955 merged + follow-up #1959 merged (2 blockers fixed: restatement + @param). 3 T1, 0 T2.
- `packages/shopify-graphql`: #1953 merged + follow-up #1961 merged + 2nd follow-up #1962 merged (3 blockers across two cycles: missing types + JSDoc binding to wrong symbol). 5 T1 net.
- `packages/cart/core`: #1960 merged (reviewer killed mid-flight; no blockers surfaced). 38 T1, 3 T2, 15 files.
Calibration findings:
- **Generator may need 2 attempts.** Multiple agents hit stream timeouts (cart-core retry, shopify-graphql-fix retry). Re-dispatch from a clean worktree works.
- **Re-exported types from third-party libraries are still Tier 1.** Spec § "In scope (the what)" item 5 has no third-party carve-out. Generators should not skip them.
- **JSDoc placement matters for binding.** TS binds JSDoc to the immediately-following declaration. When an internal helper sits between the doc block and the intended public symbol, the doc lands on the wrong target. Generator should `Edit` the block adjacent to its symbol with no intervening declarations.
- **gh `--force-with-lease` fails when the remote branch was deleted between fetch and push.** Agents using `--force` after such a delete should verify the remote branch doesn't exist before pushing (to avoid accidentally re-creating a merged branch under a stale name). Workaround: rename the local branch before pushing the follow-up fix.

## Wave 3 — Dependent packages (shopify-html, marketing-common, test-mongo, cart/shopify, cart/react)

Status: completed
Started: 2026-05-27
Completed: 2026-05-27
PRs:
- `packages/shopify-html`: #1964 merged + #1968 followup merged (missing @example on Tier-1 type).
- `packages/marketing-common`: #1963 merged (LGTM clean).
- `packages/test-mongo`: #1966 merged (LGTM clean).
- `packages/cart/shopify`: #1965 merged + #1970 followup merged (missing @example on pre-existing Tier-1 fn).
- `packages/cart/react`: #1967 merged + #1969 followup merged (2 missing @example + capability-mixin example typing + American English).
Calibration findings:
- **Pre-existing Tier-1 blocks in modified files lack @example most of the time.** Formalized into spec § Edge case rules: "Modified-file rule: bring all Tier-1 symbols up to spec."
- **Capability-mixin @example blocks need narrowed types.** Spec's "@example references real symbols" rule extends to "@example would actually typecheck against the real definitions". Bare `useCartActions<CartCapabilities>()` fails the test because conditional types resolve to the empty branch.
- **British English creeps in.** "synchronises" caught on cart-react. CLAUDE.md mandates American English; agents should check for `-ise/-ised` endings in added prose.

## Wave 4 — Large packages (cart/next, cms)

Status: completed
Started: 2026-05-27
Completed: 2026-05-27
PRs:
- `packages/cart/next`: #1990 merged + #1992 followup merged (4 pre-existing Tier-1 fns lacked @example).
- `packages/cms`: #1991 merged (7 reviewer blockers amended into the same branch via force-push before merge — all Tier-1 in touched files needed full content). 163 new JSDoc blocks across 92 files.
Calibration findings:
- **Modified-file rule pays off at scale.** cms's 7 blockers were all instances of the new rule: when a file is modified, every Tier-1 symbol must satisfy spec. Will be the dominant fix category in remaining waves.
- **Inline `//` comment → JSDoc replacement** is now explicitly permitted in the spec (came up in cms review).
- **Spec calibration formalized in commit 3f1535799** — modified-file rule + inline-comment rule.

## Wave 5 — Apps (admin, storefront)

Status: in_progress
Started: 2026-05-27
Completed: —
PRs:
- `apps/admin`: pending generator dispatch
- `apps/storefront` (split into 4 sub-PRs by top-level src/ dir):
  - `apps/storefront/src/components/**` (131 files): pending
  - `apps/storefront/src/utils/**` (50 files): pending
  - `apps/storefront/src/api/**` (33 files): pending
  - `apps/storefront/src/{app,auth,blocks,cart,hooks,middleware,models}/** + root` (~52 files): pending
Calibration findings: —

## Wave 6 — Final (landing)

Status: pending
Started: —
Completed: —
PRs:
- `apps/landing`: —
Calibration findings: —

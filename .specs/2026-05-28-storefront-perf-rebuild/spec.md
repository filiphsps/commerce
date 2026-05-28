# Storefront Recovery & Rebuild — Spec

**Date:** 2026-05-28
**Owner:** Storefront recovery (lead architect)
**Baseline:** `master` @ `2cccd3f9a` — all four gates GREEN (build:packages 19/19, typecheck 25/25, lint 0 errors, storefront 841 pass / cart 111 pass).

## Problem

The storefront recently shipped a wave of cart/product and iOS-crash fixes. Independent re-assessment across six dimensions (functional, iOS, performance, tenant-customization, design, build) confirms the committed fixes largely landed and the three originally-reported symptoms are now functional — **but** a handful of crash/UX paths are still broken or partial, several high-leverage performance anti-patterns remain, and the product is "competent SaaS template," not "impressive." Tenant customization is only "two colors deep," and there is no extensibility surface.

Concretely, what is still wrong today (verified in current source):

- **Crash / correctness (P0):**
  - `use-is-desktop.ts:25` calls `mql.addEventListener('change', …)` with no feature detection — a `TypeError` on iOS ≤13 that now runs on every shoppable page (hot path). **Broken.**
  - `product-card-cta.tsx:24` / `product-card-picker.tsx` call the throwing `useCartActions()` before any guard, with no per-card error isolation — a single card's `CartProviderError` blanks the whole page body (only page-level `fallbackRender={() => null}` exists). **Unaddressed.**
  - Card add path ignores the `addLine` result (no `result.ok` check, no error toast, picker closes on failure) and emits no `add_to_cart` analytics. Snapshot construction is duplicated verbatim across two files. **Functional/observability gap.**
  - `float.tsx:56` ships unguarded `backdrop-blur-md` — residual GPU crash on iPadOS 14/15 at desktop width. **Partial.**
  - `useVariantUrlSync.ts:55` deps/comment drift (`searchParams` still in deps; test comment claims it was removed). **Partial.**
  - Empty-cart state is a hardcoded English string (`cart-lines.tsx:33`).
  - `interactiveWidget: 'resizes-content'` (`layout.tsx:38`) is ignored by iOS Safari, so the SheetPicker (primary mobile add-to-cart surface) and other fixed-bottom bars stay keyboard-occluded; needs `visualViewport`-based inset handling (assess-ios A6). **Partial.**
  - CI `pnpm test` flaps red on a green suite via a vitest V8 coverage `.tmp` race.

- **Performance:** middleware runs an uncached `Shop.findByDomain(…, {sensitiveData:true})` (+ a Shopify `LocalesApi` round-trip on cookie-less requests) on every edge request; `abstract-api.ts:119` defaults every Storefront query to `cache:'no-store'`, nullifying the 8h link revalidate on all non-`use cache` paths; `ShopifyApiConfig` re-runs an uncached DB lookup on every pooled-client call; a 250×-everything product fragment serves every surface; images are unoptimized with a wildcard `remotePatterns` host.

- **Tenant / extensibility:** only brand accents + logo are per-tenant. The full ~120-token product-card vocabulary, fonts, surface/text colors, page chrome, and PDP/PLP template layout are hardcoded globally. Block dispatch is a duplicated hardcoded `switch`; the only registries (picker/CTA) are closed and not tenant-aware. No third-party extension path.

- **Design:** ~130 hardcoded `gray/red/green/amber/white` utilities; no semantic surface/text/border/state/focus tokens; one `Button` variant; broken `focus-visible::` double-colon typos; `transition-color` typo; Biome a11y disabled; blank homepage `loading.tsx`; bare empty/404/error states; no LQIP/blur-up; no PDP zoom.

## Goal

Take the storefront to: **functional + acceptable + impressive + tenant-customizable + extensible**, in that priority order. Crash safety and correctness first; then the highest impact-per-effort performance wins; then the caching/query/image architecture; then the tenant-theme and CMS-composition foundations; then the extensibility registry; then the token-driven design polish that reaches "impressive."

## Scope

In scope: `apps/storefront`, plus `@nordcom/cart-*` (runtime changes need a changeset), `@nordcom/commerce-db`, `@nordcom/commerce-cms`, `@nordcom/commerce-shopify-graphql`, `@nordcom/commerce-errors` (all ignored by changesets per `ignore: ["@nordcom/*", "!@nordcom/cart-*"]`).

Out of scope: checkout handoff (verified robust), cart persistence (verified), the four already-landed fixes (verified done), router `staleTimes` (intentional), `cacheComponents`/PPR (already configured).

**Accepted regression (recorded decision, not a silent drop):** the in-cart "Edit options" variant-swap popover (`cart-line.tsx`, `showSelector` effectively false) was intentionally dropped when cart lines migrated to cart-core — cart-core lines no longer carry full product options/variants (assess-functional A(a)). This is a feature regression vs. prior behavior, accepted for now. Restoring it would require cart-core lines to carry option/variant data (a `@nordcom/cart-*` runtime change → changeset); deferred to the backlog unless re-prioritized.

## Constraints (CLAUDE.md — non-negotiable)

- Root cause, never symptom — no reverts, no empty-array stubs, no feature-disabling first-guesses (esp. Next cache/PPR, build tooling, OIDC, Shopify GraphQL field mismatches).
- Throw via `@nordcom/commerce-errors` (add a class + `*ErrorKind` + `getErrorFromCode` case if none fits), never `new Error`.
- JSDoc on every function and component (purpose + `@param`/`@returns`/`@throws`).
- Tenant context never implicit — every data helper takes `{ shop, locale }` explicitly.
- Server Components by default; `'use client'` only for hooks/handlers/browser APIs; never import `server-only` (transitively) from a client component.
- `noUncheckedIndexedAccess` (index access is `T | undefined`; no `!` papering); `trailingSlash: true`; async `params`/`searchParams`/`cookies()`/`headers()`; preserve `experimental_taintUniqueValue` on provider tokens.
- Biome only (lint + format). American English. No unused vars/params/imports (delete, don't underscore/`void`/`biome-ignore`).
- `pnpm build:packages` before lint/typecheck/test. Use `pnpm <script>` (forwards args). Changeset only for `@nordcom/cart-*` runtime changes. Conventional Commits with scope; rebase never merge; amend over fixup.

## Definition of done (per layer)

- **Functional/crash:** no iOS-≤13 throw; no single-card crash can blank the page; card adds surface success/error + emit `add_to_cart`; empty-cart is i18n with a CTA; CI green is trustworthy (no coverage flake).
- **Performance:** middleware does no per-request uncached Mongo/Shopify round-trip; Storefront queries are cached-by-default with explicit `no-store` only for dynamic data; images optimized + host-restricted; lean card fragment for list surfaces.
- **Tenant:** a tenant can theme surfaces/text/borders/states, typography, and product-card knobs from the shop record; toggle sections without a deploy.
- **Extensible:** one shared block registry; CMS-driven slot composition for chrome + templates; tenant-aware variant registry; a documented manifest path for third-party extensions.
- **Design:** semantic token-driven UI, tenant-themeable beyond the accent, a11y gate re-enabled, polished empty/error/loading states and imagery.

Full ordered task breakdown with dependencies in `plan.md`.

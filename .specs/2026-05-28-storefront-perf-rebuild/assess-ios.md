# iOS Safari Compatibility & Crash-Safety Assessment (CURRENT code)

**Date:** 2026-05-28
**Scope:** `apps/storefront` — verification of the iOS-crash fixes claimed by commits
`fb03e72aa`, `8333bc6c9`, `e51851e4e`, `5d2afc19f`, `2cccd3f9a`.
**Method:** read CURRENT source at each finding's file:line and confirm the fix is present.

## Verdict table

| ID | Finding | Status | Evidence (file:line) |
|----|---------|--------|----------------------|
| B1/C1 | matchMedia → `useIsDesktop()` in render | **DONE** | `product-card-picker.tsx:8` imports `useIsDesktop`; `:99` `const isDesktop = useIsDesktop()`; `:102` `if (isDesktop === null) return null`. No inline `window.matchMedia(` (only a comment at `:98`). Renders `null` (SSR-matching) until resolved → no WKWebView TypeError, no fiber-type hydration mismatch. |
| B2 | `selectVariant` effect deps stable | **DONE** | `product-actions-container.tsx:74-85` — dep array is `[optionsKey]` (a stable stringified key), not `productOptionsCtx?.selectVariant`. Comment `:67-72` documents the infinite-loop avoidance. |
| A4 | `useVariantUrlSync` double-replace | **PARTIAL** | `useVariantUrlSync.ts:55` STILL has `searchParams` in deps. Double-replace is nonetheless guarded by `prevKeyRef` (`:40-41`, ref updated synchronously before `router.replace` at `:54`), and tested (`useVariantUrlSync.test.ts:77-107`). The crash/throttle risk is closed, BUT the test comment `:81` falsely claims "After removing searchParams from deps entirely" — it was never removed. Code/comment drift. |
| A2 | `animation-timeline` `@supports` guard | **DONE** | `globals.css:535-538` — `animation` + `animation-timeline: scroll(self inline)` wrapped in `@supports (animation-timeline: scroll())`. |
| A3 | SheetPicker safe-area inset | **DONE** | `sheet.tsx:56` — `pb-[max(1rem,env(safe-area-inset-bottom))]`. |
| A5 | Modal `h-dvh`, no nested fixed | **DONE** | `modal.tsx:54` uses `h-dvh max-h-dvh` (not `h-screen`); inner div `:59` is `m-2 flex h-full min-h-dvh …` — `position: fixed` removed, so no nested fixed compositor trap. Old `[-webkit-overflow-scrolling:touch]` gone. |
| A1/C4 | FloatPicker `backdrop-blur` for old iOS | **NOT-DONE (mitigated)** | `float.tsx:56` still carries unguarded `backdrop-blur-md` + `bg-white/97`. Not removed, no `@supports` fallback. Crash surface avoided on iOS phones only because the B1/C1 fix routes mobile → `SheetPicker` (`resolvePresentation` `:39`). Residual: iPad at ≥768px on iPadOS 14/15 still renders FloatPicker with backdrop-filter. |
| A7 | `100vh` → `dvh` | **DONE** | `page-content.tsx:28` — `min-h-[calc(100dvh-14rem)]`. |
| A8 | chip `touch-action: manipulation` | **DONE** | `text-chip-renderer.tsx:67,87`; `size-chip-renderer.tsx:67,85`; plus all product-options primitives (`chip.tsx:20`, `swatch.tsx:24`, `more.tsx:35`, `overlay.tsx:48,67,95,124,152`). |
| B6 | `resolveInitialVariantId` GID double-encode | **DONE** | `product-content.tsx:30` — `raw.startsWith('gid://') ? raw : \`gid://shopify/ProductVariant/${raw}\``. |
| B5 | misplaced imports | **DONE** | `product-content.tsx:14-16` — `safeParseFloat`, `cn`, `unsafe_cast` hoisted to the top import block. |
| C2 | `useCartActions()` vs null guard + per-card error boundary | **NOT-DONE** | `useCartActions()` is still the THIRD hook, BEFORE the guard: `product-card-cta.tsx:24` (guard `:64`), `product-card-picker.tsx:58` (guard `:101`). No per-card `ErrorBoundary` — only two page-level `fallbackRender={() => null}` boundaries in `providers-registry.tsx:95,98`. A single card's `CartProviderError` still nulls the whole subtree. Transient (CartProvider structurally present per C5) but unaddressed. |
| C3 | `mql.addEventListener` feature-detect for iOS<14 | **NOT-DONE** | `use-is-desktop.ts:21` guards only `!window.matchMedia`; `:25` calls `mql.addEventListener('change', …)` with NO feature detection. On iOS ≤13 (Safari <14) `addEventListener` on `MediaQueryList` is undefined → `TypeError` in the effect. **Elevated risk:** `useIsDesktop` is now wired into `product-card-picker` (every card) + the product page picker — no longer the dormant `Overlay`-only path the spec assumed. |

## Remaining iOS crash / UX risks

1. **C3 (NOW HOT-PATH) — iOS ≤13 `addEventListener` TypeError.** `use-is-desktop.ts:25`. The hook fires for every product card and the product-page picker. A throw in the effect propagates to the page-level `fallbackRender={() => null}` → blank body on iOS 12/13 devices. Fix: feature-detect `mql.addEventListener` and fall back to the deprecated `mql.addListener`, or bail out when neither exists.
2. **C2 — no per-card error isolation.** `useCartActions()` (`cta.tsx:24`, `picker.tsx:58`) throws `CartProviderError` if cart context is absent (transient edge/cache request). With only page-level boundaries, one card's throw blanks the entire body. Fix: wrap each card in an isolating `ErrorBoundary`, or read cart context defensively.
3. **A1/C4 — FloatPicker backdrop-filter unguarded** (`float.tsx:56`). Residual GPU-crash risk on iPad WebKit at desktop width (iPadOS 14/15). Fix: `@supports (backdrop-filter: blur(1px))` guard or drop the blur.
4. **A4 — code/comment drift** (`useVariantUrlSync.ts:55` + `test.ts:81`). `searchParams` remains in the deps while the test asserts it was "removed entirely". Functionally guarded, but a future edit to the `prevKeyRef` guard could silently re-introduce the double-replace; the misleading comment hides the real mechanism.
5. **A9 — `-webkit-overflow-scrolling: touch`** still present (`globals.css:347`). Harmless no-op since Safari 13; not a crash. Low priority.
6. **A6 — `interactiveWidget: 'resizes-content'`** still set (`layout.tsx:38`). iOS Safari ignores it; fixed-bottom elements (SheetPicker) remain keyboard-occluded. Needs `visualViewport`-based handling, not this meta.

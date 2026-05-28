# Functional Assessment — Cart + Product Flow (apps/storefront)

**Date:** 2026-05-28
**Scope:** Verify the four committed cart/product fixes are present & correct in current code, run cart/product tests, report functional status, and surface gaps not covered by the original investigation.

Reference commits: `42395498d` (CartLine field migration), `56fc41e10` (product-card add-to-bag wiring), `5fa648309` (product-page infinite-refresh), `b16fe5d5b` (remaining D3-F005 / D2-F005 / D2-F007).

---

## A. Verification of committed fixes — ALL PRESENT & CORRECT

### (a) `components/cart/cart-line.tsx` — DONE
- `'use client'` present (line 1). D3-F005 resolved.
- Prop type is cart-core `CartLine` (`CoreCartLine<any>`), not `ShopifyCartLine`.
- Reads flat cart-core merchandise: `merch.productHandle`, `merch.productTitle`, `merch.productVendor`, `merch.unitPrice`, `merch.compareAtUnitPrice`, `merch.selectedOptions`, `merch.quantityAvailable`, and `line.cost.total` (lines 39, 68-71, 95-98, 113-120). No hydrogen-react `.price` / nested `.product` guards remain.
- `cart-lines.tsx:63` passes `data={item}` directly — the `as unknown as ShopifyCartLine` cast (D3-F002) is removed, and the hydrogen-react import is gone.
- Trade-off documented in tasks.md: in-cart variant swap ("Edit options" popover) was dropped (`showSelector` effectively false) because cart-core lines do not carry full product options/variants. Acceptable, but a feature regression vs. prior behavior.

### (b) `components/product-card/picker/{inline,float,sheet}.tsx` — DONE
- All three define an `AddToBagButton` that calls `useMaybeProductOptions()`, reads `ctx?.selectedVariant?.id`, is `disabled` when no variant, and calls `onAdd(variantId)` on click (inline 17-32, float 18-33, sheet 20-35).
- `ProductCardPickerProps` (picker/types.ts:13) now carries `onAdd: (variantId: string) => void`. D1-F003 resolved.
- Each picker forwards `onAdd` into the button inside `ProductOptions.Root`. D1-F002/F004 resolved.

### (c) `components/product-card/primitives/product-card-cta.tsx` — DONE
- `onAdd` (lines 26-62): when `picker.isSingleBuyable`, finds the seed variant, builds a full `ProductSnapshot`, and calls `addLine({ variantId, quantity: 1, snapshot })` — the fast path. Otherwise `picker.setOpen(true)`. D1-F001 resolved (Task 3.12 stub gone).
- Orchestrator `product-card-picker.tsx` mirrors this: builds the snapshot and `addLine`s on `onAdd`, then `picker?.setOpen(false)` after add.
- Provider wiring confirmed: `product-card.tsx:89` `isSingleBuyable = variantCount === 1 && seedVariant.availableForSale === true`; `seedVariantId={seedVariant.id}` feeds `ProductCardOptionsProvider`. End-to-end path is live.

### (d) `app/[domain]/[locale]/products/[handle]/product-content.tsx` — DONE
- `resolveInitialVariantId` (lines 27-51): prefers `?variant=`, then matches option-name/value params (`?Color=Red&Size=M`) against `product.variants.edges[].node.selectedOptions`, and only then falls back to `firstAvailableVariant`. D2-F004 resolved.

### Supporting D2 fixes (also verified present)
- `renderers/text-chip-renderer.tsx:37` and `renderers/size-chip-renderer.tsx:44` call `event.preventDefault()` unconditionally — no hard reload (D2-F001).
- `product-options/resolver.ts:166` calls `p.sort()` on the `URLSearchParams` (D2-F003).
- `product-options-selector.tsx:109` prefixes href with `/{locale.code}` when locale supplied (D2-F002).
- `product-actions-container.tsx`: `urlSyncOptions` memoized on `[selectedOptions]` (D2-F007, line 43); sync effect keyed on stable `optionsKey` writes back to `ProductOptionsContext.selectVariant` (D2-F005, lines 73-85).

---

## B. Test results

`pnpm test --project @nordcom/commerce-storefront` (full suite ran):
- **841 passed | 2 skipped | 0 failed** (170 files).

Cart packages (run individually):
- `@nordcom/cart-core`: 12 files, **43 passed**
- `@nordcom/cart-react`: 7 files, **25 passed**
- `@nordcom/cart-next`: 4 files, **22 passed**
- `@nordcom/cart-shopify`: 3 files, **21 passed**
- Total **111 passed, 0 failed**.

No failures to quote.

---

## C. Functional status of the three reported symptoms

| Flow | Status | Notes |
|---|---|---|
| add-to-cart-from-card | FUNCTIONAL | Wired end-to-end (single-variant fast path + multi-variant picker). BUT no `result.ok` check, no toast, no `add_to_cart` analytics — see gaps below. |
| product-page-option-selection | FUNCTIONAL | preventDefault stops hard reload; sorted, locale-prefixed hrefs avoid the double 301; `resolveInitialVariantId` selects the correct variant from option params; sync effect keeps price/stock in step. |
| cart-page-display | FUNCTIONAL | Lines render against cart-core fields. In-cart variant swap intentionally dropped (regression, documented). |

---

## D. Functional gaps NOT in the original investigation

1. **add_to_cart analytics missing from the product-card flow** (gap). `grep` across `components/product-card/` finds no `useTrackable`/`postEvent`/`add_to_cart`. Both `product-card-cta.tsx` (single-variant fast path) and `product-card-picker.tsx` (picker) call `addLine` with no analytics. The product-page `AddToCart` (`products/add-to-cart.tsx:121`) and `Checkout` (`utils/checkout.ts:129` `begin_checkout`) do emit. Card adds are invisible to GA4 — under-reports conversions.

2. **No error/toast handling on card adds** (gap). `product-card-cta.tsx:58` ignores the `addLine` result; `product-card-picker.tsx:91-92` ignores the result and calls `picker?.setOpen(false)` unconditionally. A failed add (sold-out, network) closes the picker silently with no feedback. Product-page `AddToCart` correctly does `if (!result.ok) toast.error(result.message)`. Inconsistent UX.

3. **Empty-cart UX is a hardcoded English string** (gap). `cart-lines.tsx:33` returns `<Label>There are no items in your cart.</Label>` — not i18n'd despite `tCart` being in scope, no empty-state illustration, and no "continue shopping" CTA. `CartSidebar` still renders the full summary with a disabled checkout button alongside it.

4. **Checkout handoff — WIRED, no gap.** `utils/checkout.ts` parses `checkoutUrl`, enforces `https:`, swaps only `*.myshopify.com` hosts to the tenant domain, appends the GA4 `_gl` cross-domain linker, emits `begin_checkout`, and throws typed `InvalidCartError`/`UnknownCommerceProviderError`. `cart-sidebar.tsx` guards on `cartReady`, `cartError`, and empty cart with toasts and an OTel event. Robust.

5. **Cart persistence across reload — WIRED, no gap.** `cart/kernel.ts:73` uses `httpOnlyCookieStorage()`; `readCart` reads server-side; tenant layout passes `initialCart` into `CartClientShell` → `CartProvider`. Cart survives reload via the cart-id cookie.

6. **Quantity update — WIRED, no gap.** `cart-line.tsx:208-221` `QuantitySelector` calls `updateLine({ lineId, quantity })`, short-circuits unchanged values, disabled when not ready, `allowDecreaseToZero`.

7. **Line removal — WIRED.** `cart-line.tsx:196-198` `removeLine(line.id)`; clear-cart in `cart-lines.tsx:43-47` loops `removeLine` per line. Minor: per-line removal fires N mutations instead of a bulk clear — perf/UX wart, not a break.

### Minor / convention notes (not functional breaks)
- `cart-content.tsx:15` still declares unused `shop: OnlineShop` in `CartContentProps` (D3-F007 never addressed).
- `cart/page.tsx:64-65` wraps the whole page (incl. `getDictionary`) in `'use cache'; cacheLife('max')` (D3-F006) — dictionary updates can freeze until purge.
- `picker/registry.ts:36` throws `new Error(...)` instead of a `@nordcom/commerce-errors` class — violates CLAUDE.md.
- `ProductSnapshot` construction is duplicated verbatim between `product-card-cta.tsx` and `product-card-picker.tsx` — extract a shared builder (would also be the natural home for the missing analytics/toast).

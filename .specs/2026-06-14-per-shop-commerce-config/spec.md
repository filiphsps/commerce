# Per-shop commerce config — products-per-page, geo-redirect TTL, free-shipping thresholds

Status: approved (design)
Date: 2026-06-14
Cluster: A (per-shop configurable settings) of the deferred FIXME/TODO backlog.

## Problem

Three storefront values are hardcoded and carry FIXME/TODO markers asking to make them
per-tenant configurable:

- **Catalog page size** — `products-content.tsx:41` (`const limit = 35`) and
  `collections/[handle]/collection-content.tsx:10` (`PRODUCTS_PER_PAGE = 21`).
- **Geo-redirect banner dismissal TTL** — `geo-redirect.tsx:47-49` (hardcoded 24h).
- **Free-shipping threshold** — `cart/cart-summary.tsx:36` (`// TODO: Configurable free shipping`);
  the shipping row renders a static `TBD*`, and the `shop` prop is accepted but discarded
  ("reserved for free-shipping config").

These are deferred because each needs a per-shop config surface. The shop already has a
`commerce` settings group; this adds three fields to it.

## Goals

- A merchant can set, per shop, the catalog page size, the geo-redirect dismissal window, and
  per-currency free-shipping messaging thresholds — via the existing descriptor-driven shop
  settings editor (no bespoke admin code).
- When a setting is unset, the storefront behaves byte-identically to today.

## Non-goals

- `?limit=` per-request page-size override (would invalidate the parent's precomputed cursor
  array + page count; the count queries are O(total/pageSize) serial round-trips).
- Changing real shipping cost. Shopify computes shipping at checkout; the threshold here is
  storefront **messaging only**.
- FX conversion. A threshold applies only to a cart whose presentment currency matches it.
- Restricting the threshold currency picker to the shop's enabled presentment currencies (the
  descriptor `select` is a static list; use the full ISO currency list).

## Architecture context (why the data model is the way it is)

The shop shape has **no single generator** — it is a dual-source-of-truth:

1. **Descriptor** — `packages/cms/scripts/codegen/content-shapes.ts` defines the shop's
   `commerce` group. `pnpm cms:gen` regenerates the storefront read types
   (`packages/cms/src/types/content-types.ts`) and the admin editor-action wrappers
   (`apps/admin/src/lib/cms-actions/_generated`). The shop settings editor
   (`settings/shop/page.tsx` → `shopsEditor` manifest → `EditorEditPage`) renders descriptor
   fields automatically. `cms:gen:check` is the CI drift gate.
2. **Hand-written canonical TS type** — `ShopBase.commerce` in
   `packages/db/src/models/shop.ts` (`OnlineShop` derives from it; ~346 importers).
3. **Hand-written Convex table validator** — `shopCommerceValidator` in
   `packages/convex/convex/tables/shops.ts`, consumed by `db/shop_write:upsertShop`. NOT
   emitted by `cms:gen` (that emits `tables/cms.ts`; the `shops` table is platform-global and
   hand-written). If a field is missing here, the upsert mutation rejects the write.
4. **Storefront defaults** — `COMMERCE_DEFAULTS` in `apps/storefront/src/utils/build-config.ts`.

So **each new `commerce.*` field is edited in all four places** and verified with `cms:gen:check`.
This mirrors the existing `maxQuantity` / `processingTimeInDays` fields exactly.

## Data model

Three new optional fields on `commerce`:

```ts
commerce?: {
    maxQuantity?: number;
    processingTimeInDays?: number;
    productsPerPage?: number;                                   // NEW
    geoRedirectDismissalHours?: number;                         // NEW
    freeShippingThresholds?: { currencyCode: string; amount: number }[]; // NEW
};
```

Descriptor additions to the `commerce` group in `content-shapes.ts`:

```ts
{ name: 'productsPerPage', type: 'number' },
{ name: 'geoRedirectDismissalHours', type: 'number' },
{
    name: 'freeShippingThresholds',
    type: 'array',
    fields: [
        { name: 'currencyCode', type: 'select', options: CURRENCY_CODES, required: true },
        { name: 'amount', type: 'number', required: true },
    ],
},
```

`CURRENCY_CODES` = the value list of the Shopify Storefront `CurrencyCode` enum
(`packages/shopify-graphql/src/graphql-env.d.ts`). If no runtime array of these codes exists yet,
add a shared `CURRENCY_CODES` const (in `@nordcom/commerce-cms` codegen helpers or a shared
constants module) rather than inlining the list — the descriptor `select`, the storefront
`CurrencyCode` type, and any validation should reference one source.

No descriptor `defaultValue` on the new fields — absence keeps existing shop rows unchanged and
lets storefront fallbacks own the defaults. The `array` field emits
`v.array(v.object({ currencyCode, amount }))` in the validator and `{ currencyCode: string;
amount: number }[]` in the content-type (same machinery as `design.accents`).

`COMMERCE_DEFAULTS` gains `geoRedirectDismissalHours: 24`. `productsPerPage` needs no
`COMMERCE_DEFAULTS` entry (per-surface fallbacks below). `freeShippingThresholds` has no default
(absent ⇒ today's behavior).

## Behavior

### products-per-page

Single knob, per-surface fallback so an unset shop is unchanged:

- Catalog (`products-content.tsx`): `const limit = clampPageSize(shop.commerce?.productsPerPage ?? 35);`
- Collection: `PRODUCTS_PER_PAGE` (21) stays as the fallback. Both the parent count precompute
  (`page.tsx:176`, `:320`) and the content fetch (`collection-content.tsx:53`, `:58`) read the
  **same** value: `clampPageSize(shop.commerce?.productsPerPage ?? PRODUCTS_PER_PAGE)`. They must
  agree or the cursor math breaks.
- `clampPageSize(n)` clamps to `[1, 250]` (Shopify's `first` max) and floors to an integer.

### geo-redirect TTL

`readStoredDismissed` is a module-level `useSyncExternalStore` snapshot with no `shop` access, so
the TTL cannot reach it directly. Refactor:

- `readStoredDismissed` returns the raw stored epoch-ms timestamp (or null) — no expiry/removal.
- The `GeoRedirect` component computes expiry against
  `shop.commerce?.geoRedirectDismissalHours ?? COMMERCE_DEFAULTS.geoRedirectDismissalHours`
  (× 3_600_000 ms) and clears `localStorage` when expired (in an effect, not in render).
- The snapshot must stay referentially stable to avoid `useSyncExternalStore` loops.

### free-shipping

- `CartSummary` consumes its `shop` prop (currently discarded).
- Pure helper `resolveFreeShipping({ thresholds, currencyCode, subtotal })`:
  - `currencyCode` = cart presentment currency (`cost.subtotal?.currencyCode ?? cost.total?.currencyCode ?? shop currency`).
  - `subtotal` = `safeParseFloat(0, cost.subtotal?.amount)`.
  - Find the threshold whose `currencyCode` matches. Returns:
    - `{ state: 'none' }` — no matching threshold, or subtotal ≤ 0.
    - `{ state: 'progress', threshold, remaining }` — subtotal < threshold.
    - `{ state: 'unlocked', threshold, remaining: 0 }` — subtotal ≥ threshold.
- `<FreeShippingProgress>` sub-component (own file, returns null on `state:'none'`):
  - `progress`: "You're {Price(remaining)} away from free shipping" + a progress bar
    (`min(subtotal/threshold, 1)`), styled with existing block/`--surface-*` tokens.
  - `unlocked`: "You've unlocked free shipping!".
- Shipping row (`cart-summary.tsx:128`): `t('free')` when `unlocked`, else the existing `TBD*`.
  The `*shipping-calculated-at-checkout` footnote stays.
- New `cart`-scope i18n keys, authored in all six locale dictionaries
  (`apps/storefront/src/locales/{en,sv,de,fr,no,es}.json`):
  - `free-shipping-progress` (one substitution slot for the remaining amount),
  - `free-shipping-unlocked`,
  - `free` (reuse an existing `cart.free` / `common.free` key if one already exists rather than
    adding a duplicate).

## Components / isolation

- `resolveFreeShipping` — pure function, unit-testable, no React. Likely
  `apps/storefront/src/components/cart/free-shipping.ts` (helper) + `free-shipping.tsx` (component).
- `clampPageSize` — small pure helper in a shared util (e.g. `apps/storefront/src/utils/`) so
  both the catalog and collection surfaces import the same clamp; unit-testable.
- `FreeShippingProgress` — presentational client component; input is the resolved state + i18n.
- `GeoRedirect` change is localized: snapshot simplification + component-side expiry.

## Testing

- Unit: `resolveFreeShipping` — none (no match / currency mismatch / zero subtotal), progress
  (remaining math), unlocked (boundary subtotal === threshold). `clampPageSize` — below 1, above
  250, fractional, normal.
- Component: `CartSummary` renders all three free-shipping states + the unchanged no-threshold
  case; `GeoRedirect` re-shows after the configured TTL and stays dismissed within it;
  catalog/collection read the shop page size.
- Validator: extend `packages/convex/convex/tables/shops.test.ts` to accept the three new
  `commerce` fields (incl. the thresholds array).
- Gate: `pnpm cms:gen:check` passes; storefront + convex limit-boundary suites green.

## Rollout

Additive and backward-compatible — every field optional; unset ⇒ identical to today. No data
migration. Touches the `@nordcom/*` (changeset-ignored) packages plus the storefront app.

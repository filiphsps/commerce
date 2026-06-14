# Shop identity — per-shop default currency, locale-TODO cleanup, tenant countries fallback

Status: approved (design)
Date: 2026-06-14
Cluster: B (shop identity fields) of the deferred FIXME/TODO backlog. Builds on cluster A's
per-shop `commerce.*` pattern (`.specs/2026-06-14-per-shop-commerce-config/`).

## Problem

Three related deferred markers:

- `components/shop/provider.tsx:15` — `currency` carries `@todo TODO: This should be a part of the
  shop object.` It is a `ShopProvider` prop defaulting to `'USD'`; the shop record never supplies it,
  so every tenant displays USD pre-cart regardless of its real presentment currency.
- `components/shop/provider.tsx:20` — `locale` carries the same `@todo`. **This one is misguided:**
  the prop is the *active request locale* (one shop serves many locales), so it is correctly
  request-scoped, not a static shop field. The shop already carries `i18n.defaultLocale`.
- `api/store.ts:69` — `// FIXME: Handle tenant-specific default.` `CountriesApi` falls back to a
  hardcoded US `DEFAULT_LOCALE` when Shopify returns no countries.

## Goals

- A shop can declare its default presentment currency; the storefront uses it instead of hardcoded
  `'USD'`. Unset shops behave exactly as today.
- The `locale` prop is documented accurately (request-scoped) so the misleading TODO is gone.
- `CountriesApi`'s no-data fallback reflects the shop's configured default locale, not always US.

## Non-goals

- Active locale as a shop field (it is request-scoped — documented wontfix).
- Per-locale / multi-currency presentment config (single default presentment currency only).
- FX conversion.

## Data model

New optional field on `commerce` (same dual-source-of-truth sync as cluster A):

```ts
commerce?: {
    // ...existing (maxQuantity, processingTimeInDays, productsPerPage,
    //   geoRedirectDismissalHours, freeShippingThresholds)
    currency?: string; // ISO 4217 / Shopify CurrencyCode; the shop's default presentment currency
};
```

Per-field sync checklist (mirrors cluster A):
1. `packages/cms/scripts/codegen/content-shapes.ts` — add `currency` to the `commerce` group as a
   `select` over `CURRENCY_CODES`.
2. `packages/cms/src/editor/collection-fields.ts` — add `currency` to the `commerce` group
   (`selectField`).
3. `pnpm cms:gen` — regenerates `content-types.ts` + editor actions; `cms:gen:check` gates drift.
4. `packages/db/src/models/shop.ts` — add `currency?: string` to `ShopBase.commerce`.
5. `packages/convex/convex/tables/shops.ts` — add `currency: v.optional(v.string())` to
   `shopCommerceValidator`.

No descriptor `defaultValue` — absence keeps existing shop rows unchanged; the storefront fallback
(`'USD'`) owns the default.

### CURRENCY_CODES (shared)

Introduce a `CURRENCY_CODES` const — the 160 Shopify Storefront `CurrencyCode` enum values
(`packages/shopify-graphql/src/graphql-env.d.ts`, excluding the `XXX` sentinel) — in the CMS
descriptor layer, used by **both** the new `commerce.currency` select **and** a retrofit of
`commerce.freeShippingThresholds.currencyCode` from `text` → `select`. Rationale: an invalid
currency code would crash `Intl.NumberFormat` on every pre-cart price render; a closed select
prevents typos. The retrofit emits the same `string` content-type and `v.string()` validator, so it
is editor-UI-only (no type/validator change) — low risk, and it makes cluster A's field consistent.

## Behavior

### Currency wiring

`components/providers-registry.tsx` (`ProvidersRegistry`): make the `currency` prop optional and
resolve `const resolvedCurrency = currency ?? shop.commerce?.currency ?? 'USD'`, passing it to
`ShopProvider`. An explicit prop still wins; otherwise the shop's configured currency; otherwise
`'USD'`. `ShopProvider` keeps its own `'USD'` default unchanged. `useShop().currency` consumers
(Price, free-shipping, cart summary) get the shop currency with no further changes.

`provider.tsx`: replace the `currency` `@todo` with accurate docs — "the shop's default presentment
currency, sourced from `shop.commerce.currency` upstream".

### Locale TODO cleanup

`provider.tsx`: replace the `locale` `@todo` with: "Active request locale, resolved by the
`request → shop default → platform default` chain before this provider; intentionally a prop, not a
shop field, because one shop serves many locales." No behavior change.

### Tenant-specific countries fallback

`api/store.ts`: replace the module-level hardcoded `DEFAULT_LOCALE` with a pure helper
`tenantDefaultCountry(shop: OnlineShop): Country` that derives the fallback from
`shop.i18n?.defaultLocale`:

- Parse the default locale (e.g. `sv-SE`) via `Locale` into language (`SV`) + country (`SE`).
- Build `{ isoCode: country, name: <region display name>, availableLanguages: [{ isoCode: language,
  name: <language display name> }] }` using `Intl.DisplayNames('en', { type: 'region' | 'language' })`.
- Fall back to the existing US shape when the shop has no `i18n.defaultLocale` or parsing fails.

`CountriesApi` obtains the shop via `api.shop()` and uses `tenantDefaultCountry(api.shop())` in the
`?? [DEFAULT]` position. The `availableLanguages` null-guard `.map(...)` stays.

## Components / isolation

- `tenantDefaultCountry` — pure function (input: shop; output: `Country`), no I/O, unit-testable.
  Lives in `api/store.ts` (store-specific) and is exported so it can be unit-tested directly.
- `CURRENCY_CODES` — single shared const in the CMS descriptor layer.
- Currency wiring is a one-line resolution in `ProvidersRegistry`; no new component.

## Testing

- Validator: extend `packages/convex/convex/tables/shops.test.ts` `fullShop.commerce` with
  `currency` and assert acceptance.
- `tenantDefaultCountry`: shop with `i18n.defaultLocale: 'sv-SE'` → `isoCode 'SE'`, language `SV`;
  shop with no `i18n` → US fallback; malformed default locale → US fallback.
- Currency wiring: a test asserting `useShop().currency` reflects `shop.commerce.currency` when set
  (and `'USD'` when absent) — via `ProvidersRegistry` or a focused provider render.
- Gate: `pnpm cms:gen:check`, storefront + convex suites, `cms:gen` drift clean.

## Rollout

Additive, backward-compatible: `commerce.currency` optional; unset ⇒ `'USD'` as today. The
thresholds `text → select` retrofit changes only the admin editor control. No data migration.
Changeset-exempt (`@nordcom/*` ignored; storefront app private). Lands on the existing
`fix/resolve-fixmes-todos` branch / PR #2033.

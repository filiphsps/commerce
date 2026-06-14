# Shop identity fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-shop default presentment currency, wire it through the shop provider, document the request-scoped `locale` prop honestly, and make `CountriesApi`'s no-data fallback tenant-specific.

**Architecture:** Reuses cluster A's dual-source `commerce.*` pattern (descriptor + `ShopBase` + Convex validator + `cms:gen`). A shared `CURRENCY_CODES` const drives a `select` for the new `commerce.currency` and a retrofit of `freeShippingThresholds.currencyCode`. A pure `resolveShopCurrency` helper and a pure `tenantDefaultCountry` helper keep the wiring unit-testable.

**Tech Stack:** TypeScript, Next.js 16 (Server + Client Components), Convex validators, Biome, Vitest. Run `pnpm build:packages` before lint/typecheck/test. NOTE: a `block-new-error` hook forbids `new Error(...)` — throw via `@nordcom/commerce-errors` (also in tests).

---

## File Structure

- Create `packages/cms/src/constants/currencies.ts` — `CURRENCY_CODES` (shared).
- Modify `packages/cms/scripts/codegen/content-shapes.ts` — `commerce.currency` select + thresholds retrofit.
- Modify `packages/cms/src/editor/collection-fields.ts` — same, via `selectField`.
- Generated (do not hand-edit): `packages/cms/src/types/content-types.ts`, `apps/admin/src/lib/cms-actions/_generated/**`.
- Modify `packages/db/src/models/shop.ts` — `ShopBase.commerce.currency`.
- Modify `packages/convex/convex/tables/shops.ts` — `shopCommerceValidator.currency`.
- Modify `packages/convex/convex/tables/shops.test.ts` — validator coverage.
- Modify `apps/storefront/src/components/shop/provider.tsx` — `resolveShopCurrency` + JSDoc cleanup.
- Create `apps/storefront/src/components/shop/provider.test.tsx` — `resolveShopCurrency` tests.
- Modify `apps/storefront/src/components/providers-registry.tsx` — use `resolveShopCurrency`.
- Modify `apps/storefront/src/api/store.ts` — `tenantDefaultCountry` + `CountriesApi` wiring.
- Create `apps/storefront/src/api/store.test.ts` — `tenantDefaultCountry` tests.

---

## Task 1: Data model — `commerce.currency` + shared `CURRENCY_CODES` + thresholds retrofit

**Files:**
- Create: `packages/cms/src/constants/currencies.ts`
- Modify: `packages/cms/scripts/codegen/content-shapes.ts` (commerce group ~576-588)
- Modify: `packages/cms/src/editor/collection-fields.ts` (commerce group ~99-111)
- Modify: `packages/db/src/models/shop.ts` (`ShopBase.commerce`)
- Modify: `packages/convex/convex/tables/shops.ts` (`shopCommerceValidator`)
- Test: `packages/convex/convex/tables/shops.test.ts`

- [ ] **Step 1: Extend the validator fixture + acceptance test (failing)**

In `packages/convex/convex/tables/shops.test.ts`, add `currency: 'USD'` to the `fullShop.commerce`
object, and add inside `describe('shopValidator', …)`:

```ts
    it('accepts a per-shop default currency', () => {
        expect(validate(shopValidator, fullShop)).toBe(true);
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-convex test tables/shops.test.ts`
Expected: FAIL — `shopCommerceValidator` rejects the extra `currency` key.

- [ ] **Step 3: Add `currency` to the validator**

In `packages/convex/convex/tables/shops.ts`, add to `shopCommerceValidator` (after `productsPerPage`):

```ts
    currency: v.optional(v.string()),
```

Update the validator's JSDoc to mention the default presentment `currency`.

- [ ] **Step 4: Run the validator test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-convex test tables/shops.test.ts`
Expected: PASS.

- [ ] **Step 5: Mirror on `ShopBase`**

In `packages/db/src/models/shop.ts`, add to the `commerce` block:

```ts
        currency?: string;
```

- [ ] **Step 6: Create the shared `CURRENCY_CODES` const**

Create `packages/cms/src/constants/currencies.ts`:

```ts
/**
 * Shopify Storefront `CurrencyCode` enum values, as a runtime array for descriptor `select`
 * options. Mirrors the `CurrencyCode` union in `@nordcom/commerce-shopify-graphql` (the deprecated
 * `XXX` "no currency" sentinel is intentionally omitted).
 */
export const CURRENCY_CODES = [
    'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF',
    'BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN','BYR','BZD','CAD','CDF','CHF','CLP','CNY','COP',
    'CRC','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS',
    'GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HRK','HTG','HUF','IDR','ILS','INR','IQD','IRR','ISK',
    'JEP','JMD','JOD','JPY','KES','KGS','KHR','KID','KMF','KRW','KWD','KYD','KZT','LAK','LBP','LKR',
    'LRD','LSL','LTL','LVL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU','MUR','MVR','MWK',
    'MXN','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB','PEN','PGK','PHP','PKR','PLN',
    'PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK','SGD','SHP','SLL','SOS','SRD',
    'SSP','STD','STN','SYP','SZL','THB','TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS','UAH','UGX',
    'USD','UYU','UZS','VED','VEF','VES','VND','VUV','WST','XAF','XCD','XOF','XPF','YER','ZAR','ZMW',
] as const;
```

- [ ] **Step 7: Add the descriptor field + retrofit (content-shapes)**

In `packages/cms/scripts/codegen/content-shapes.ts`, add the import near the other top imports:

```ts
import { CURRENCY_CODES } from '../../src/constants/currencies';
```

In the `commerce` group `fields`, add `currency` (after `geoRedirectDismissalHours`) and change the
`freeShippingThresholds.currencyCode` from `text` to a `select`:

```ts
                { name: 'currency', type: 'select', options: [...CURRENCY_CODES] },
                {
                    name: 'freeShippingThresholds',
                    type: 'array',
                    fields: [
                        { name: 'currencyCode', type: 'select', options: [...CURRENCY_CODES], required: true },
                        { name: 'amount', type: 'number', required: true },
                    ],
                },
```

(No `defaultValue` on `currency` — absence keeps existing rows unchanged.)

- [ ] **Step 8: Add the descriptor field + retrofit (editor collection-fields)**

In `packages/cms/src/editor/collection-fields.ts`, add the import:

```ts
import { CURRENCY_CODES } from '../constants/currencies';
```

In the `commerce` `groupField` `fields`, add `currency` and change the thresholds `currencyCode` to a
`selectField`:

```ts
            selectField({ name: 'currency', options: CURRENCY_CODES.map((code) => ({ label: code, value: code })) }),
            arrayField({
                name: 'freeShippingThresholds',
                fields: [
                    required(
                        selectField({
                            name: 'currencyCode',
                            options: CURRENCY_CODES.map((code) => ({ label: code, value: code })),
                        }),
                    ),
                    required(numberField({ name: 'amount' })),
                ],
            }),
```

- [ ] **Step 9: Regenerate CMS artifacts**

Run: `pnpm build:packages && pnpm cms:gen`
Expected diff: `content-types.ts` now types `commerce.currency?: '<160-currency union>' | null`, and
`freeShippingThresholds[].currencyCode` becomes the same union (was `string`) — compatible (union ⊂
string; `ShopBase`/validator stay `string`). Admin editor actions regenerate. Review the diff.

- [ ] **Step 10: Verify drift gate + types**

Run: `pnpm cms:gen:check && pnpm typecheck --filter @nordcom/commerce-cms --filter @nordcom/commerce-convex --filter @nordcom/commerce-db --filter @nordcom/commerce-storefront`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add packages/cms/src/constants/currencies.ts packages/cms/scripts/codegen/content-shapes.ts packages/cms/src/editor/collection-fields.ts packages/cms/src/types/content-types.ts apps/admin/src/lib/cms-actions/_generated packages/db/src/models/shop.ts packages/convex/convex/tables/shops.ts packages/convex/convex/tables/shops.test.ts
git commit -m "feat(db): add per-shop commerce.currency and a shared currency-code select."
```

---

## Task 2: `resolveShopCurrency` + provider wiring + JSDoc cleanup

**Files:**
- Modify: `apps/storefront/src/components/shop/provider.tsx`
- Create: `apps/storefront/src/components/shop/provider.test.tsx`
- Modify: `apps/storefront/src/components/providers-registry.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/storefront/src/components/shop/provider.test.tsx`:

```tsx
import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';

import { resolveShopCurrency } from './provider';

const shopWith = (currency?: string) =>
    ({ commerce: currency === undefined ? undefined : { currency } }) as OnlineShop;

describe('resolveShopCurrency', () => {
    it('prefers the explicit override', () => {
        expect(resolveShopCurrency(shopWith('EUR'), 'GBP')).toBe('GBP');
    });
    it('falls back to the shop currency', () => {
        expect(resolveShopCurrency(shopWith('EUR'))).toBe('EUR');
    });
    it('defaults to USD when neither is set', () => {
        expect(resolveShopCurrency(shopWith(undefined))).toBe('USD');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-storefront -- src/components/shop/provider.test.tsx`
Expected: FAIL — `resolveShopCurrency` not exported.

- [ ] **Step 3: Add `resolveShopCurrency` + fix the JSDoc TODOs**

In `apps/storefront/src/components/shop/provider.tsx`, add the helper (after the imports, before the
interfaces):

```ts
/**
 * Resolves the active presentment currency: an explicit override wins, then the shop's configured
 * default (`commerce.currency`), then `'USD'`.
 *
 * @param shop - The tenant shop record.
 * @param explicit - An optional request-level currency override.
 * @returns The ISO currency code to display before the cart resolves its own currency.
 */
export function resolveShopCurrency(shop: OnlineShop, explicit?: CurrencyCode): CurrencyCode {
    return (explicit ?? (shop.commerce?.currency as CurrencyCode | undefined) ?? 'USD') as CurrencyCode;
}
```

Replace the two `@todo` JSDoc blocks on `ShopProviderBase`:

```ts
    /**
     * The shop's default presentment currency, sourced from `shop.commerce.currency` upstream and
     * used for price display before the cart resolves its own currency.
     */
    currency: CurrencyCode;

    /**
     * Active request locale, resolved by the `request → shop default → platform default` chain before
     * this provider. Intentionally a prop, not a shop field: one shop serves many locales.
     */
    locale: Locale;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-storefront -- src/components/shop/provider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire `ProvidersRegistry` to the shop currency**

In `apps/storefront/src/components/providers-registry.tsx`: import the helper and resolve the
currency from the shop. Change the `currency = 'USD'` default to an optional prop and compute the
resolved value passed to `ShopProvider`.

Add to imports:

```ts
import { resolveShopCurrency, ShopProvider } from '@/components/shop/provider';
```

Change the destructure so `currency` has no `'USD'` default (make it `currency?: CurrencyCode`), then
before the return compute:

```ts
    const resolvedCurrency = resolveShopCurrency(shop, currency);
```

and pass `currency={resolvedCurrency}` to `<ShopProvider>`.

- [ ] **Step 6: Typecheck + lint + run provider/cart tests**

Run: `pnpm typecheck --filter @nordcom/commerce-storefront`
Run: `pnpm exec biome lint apps/storefront/src/components/shop/provider.tsx apps/storefront/src/components/shop/provider.test.tsx apps/storefront/src/components/providers-registry.tsx`
Run: `pnpm test --project @nordcom/commerce-storefront -- src/components/shop src/components/cart`
Expected: PASS, no warnings.

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/src/components/shop/provider.tsx apps/storefront/src/components/shop/provider.test.tsx apps/storefront/src/components/providers-registry.tsx
git commit -m "feat(storefront): source the shop default currency from commerce.currency."
```

---

## Task 3: `tenantDefaultCountry` + `CountriesApi` fallback

**Files:**
- Modify: `apps/storefront/src/api/store.ts` (`DEFAULT_LOCALE` ~69, `CountriesApi` ~83)
- Create: `apps/storefront/src/api/store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/storefront/src/api/store.test.ts`:

```ts
import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';

import { tenantDefaultCountry } from './store';

const shopWith = (defaultLocale?: string) =>
    ({ i18n: defaultLocale ? { defaultLocale } : undefined }) as OnlineShop;

describe('tenantDefaultCountry', () => {
    it('derives the country + language from the shop default locale', () => {
        const country = tenantDefaultCountry(shopWith('sv-SE'));
        expect(country.isoCode).toBe('SE');
        expect(country.availableLanguages[0]?.isoCode).toBe('SV');
        expect(country.name).toBe('Sweden');
    });

    it('falls back to the US default when the shop has no default locale', () => {
        const country = tenantDefaultCountry(shopWith(undefined));
        expect(country.isoCode).toBe('US');
        expect(country.availableLanguages[0]?.isoCode).toBe('EN');
    });

    it('falls back to the US default for a malformed default locale', () => {
        const country = tenantDefaultCountry(shopWith('not-a-locale-!!'));
        expect(country.isoCode).toBe('US');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-storefront -- src/api/store.test.ts`
Expected: FAIL — `tenantDefaultCountry` not exported.

- [ ] **Step 3: Implement `tenantDefaultCountry` and use it in `CountriesApi`**

In `apps/storefront/src/api/store.ts`, replace the hardcoded `DEFAULT_LOCALE` (lines 69-74) with:

```ts
const US_DEFAULT_COUNTRY = {
    availableLanguages: [{ isoCode: 'EN', name: 'English' }],
    isoCode: 'US',
    name: 'United States',
} as unknown as Country;

/**
 * Builds the no-data `CountriesApi` fallback from the shop's configured default locale, so a shop
 * with no Shopify-reported countries degrades to its own country/language rather than always US.
 *
 * @param shop - The tenant shop record (reads `i18n.defaultLocale`).
 * @returns A single `Country` derived from the shop default locale, or the US default when the shop
 *   has no default locale or it cannot be parsed.
 */
export const tenantDefaultCountry = (shop: OnlineShop): Country => {
    const defaultLocale = shop.i18n?.defaultLocale;
    if (!defaultLocale) {
        return US_DEFAULT_COUNTRY;
    }

    try {
        const locale = Locale.from(defaultLocale);
        if (!locale.country) {
            return US_DEFAULT_COUNTRY;
        }

        const country = locale.country.toUpperCase();
        const language = locale.language.toUpperCase();
        const regionNames = new Intl.DisplayNames('en', { type: 'region' });
        const languageNames = new Intl.DisplayNames('en', { type: 'language' });

        return {
            isoCode: country,
            name: regionNames.of(country) ?? country,
            availableLanguages: [{ isoCode: language, name: languageNames.of(language.toLowerCase()) ?? language }],
        } as unknown as Country;
    } catch {
        return US_DEFAULT_COUNTRY;
    }
};
```

Then in `CountriesApi`, change the fallback to use the shop:

```ts
    return (
        ((localData?.localization.availableCountries ?? [tenantDefaultCountry(api.shop())]) as Country[])
            // https://nordcom.sentry.io/share/issue/b0b9721ad1e54a88b779605737472230/
            // `availableLanguages` shouldn't be nullable, but it sometimes is.
            .map((data) => ({ ...data, availableLanguages: data.availableLanguages || [] }))
    );
```

Ensure `OnlineShop` is imported (it already is, as a type). `Locale` is already imported.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-storefront -- src/api/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm typecheck --filter @nordcom/commerce-storefront`
Run: `pnpm exec biome lint apps/storefront/src/api/store.ts apps/storefront/src/api/store.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/api/store.ts apps/storefront/src/api/store.test.ts
git commit -m "feat(storefront): derive the CountriesApi fallback from the shop default locale."
```

---

## Task 4: Full verification

- [ ] **Step 1: Build, drift, lint, typecheck, tests**

Run:
```bash
pnpm build:packages
pnpm cms:gen:check
pnpm lint
pnpm typecheck --filter @nordcom/commerce-cms --filter @nordcom/commerce-convex --filter @nordcom/commerce-db --filter @nordcom/commerce-storefront
pnpm test --project @nordcom/commerce-storefront
pnpm test --project @nordcom/commerce-convex
```
Expected: all green.

- [ ] **Step 2: Limit-boundary gate (touched `packages/convex/**`)**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/limits`
Expected: PASS (skips locally without an ephemeral backend; runs in CI).

- [ ] **Step 3: Final review**

Confirm: unset shops render byte-identically (`commerce.currency` absent → `'USD'`; `CountriesApi`
fallback only differs when a shop sets `i18n.defaultLocale`); no `@todo`/`FIXME` left in
`provider.tsx` / `store.ts:69`; `cms:gen:check` clean.

---

## Notes / out of scope
- Active locale as a shop field (request-scoped — documented in `provider.tsx`).
- Per-locale / multi-currency presentment (single default presentment currency only); no FX.
- No changeset (`@nordcom/*` ignored; storefront app private). Lands on `fix/resolve-fixmes-todos` / PR #2033.

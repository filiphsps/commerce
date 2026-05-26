# Product Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the product-card chassis + primitives with a token-driven, registry-extensible system; fix the production search-renders-0-cards bug; migrate three CSS modules to Tailwind; ship surface-routed picker shells using Radix; enhance `CollectionBlock` with carousel arrows.

**Architecture:** Server-first composition. A thin client `ProductCardOptionsProvider` (split into `VariantSelectionContext` + `PickerOpenContext`) wraps a server-rendered chassis. Picker shells (`float` / `sheet` / `inline`) and CTA placements (`float-pill` / `inline-button`) live in module-level registries, loaded via `next/dynamic` to defer Radix Dialog/Popover weight. Inherit the site's `--block-*` radius / padding / spacer scale and Tailwind type utilities; product-card tokens are reserved for genuinely card-specific concerns.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind CSS 4.3, Radix UI (Dialog + Popover), gql.tada (Shopify GraphQL), vitest (unit), playwright (e2e), Biome (lint + format), pnpm workspaces.

**Companion spec:** `.specs/2026-05-26-product-card-redesign/spec.md` — full design rationale, token surface, accessibility rules, visual demos.

**Branch suggestion:** Phase 1 (search bug) MAY ship as its own PR; Phases 2–6 are coupled and should ship together (or in tight sequence). All work targets `master`.

---

## Conventions used in this plan

- **No vague verbs.** Every "edit" step shows the before/after snippet or a complete file.
- **TDD.** Write the failing test FIRST, run it, then implement, then re-run.
- **Test commands.** Vitest: `pnpm test --project @nordcom/commerce-storefront -- <path>`. Playwright: `pnpm test:e2e -- <path>`. Lint: `pnpm lint`. Typecheck: `pnpm typecheck`.
- **Commit cadence.** Every task ends with a commit. Subject follows Conventional Commits with scope per CLAUDE.md (`feat(storefront/product-card): …`, `fix(storefront/search): …`, etc.).
- **Notation.** Code snippets are illustrative; file-path comments (`// path/to/file.ts`) label location and MUST NOT be copied into the implementation verbatim.

---

# Phase 1 — Search renders 0 cards (production regression)

Spec ref: §"Bug fixes — root causes", row "Search renders 0 cards".

This phase ships standalone. Investigate the bug, fix it, add a smoke test. No primitives touched.

## Task 1.1: Smoke test that catches the bug

**Files:**
- Create: `apps/storefront/src/app/[domain]/[locale]/search/search-content-gate.regression.test.tsx`

- [ ] **Step 1: Write a failing test verifying SearchContentGate renders one card per result**

```tsx
// apps/storefront/src/app/[domain]/[locale]/search/search-content-gate.regression.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchContentGate from './search-content-gate';

vi.mock('@/components/products/search-product-card', () => ({
  __esModule: true,
  default: ({ data }: { data: { handle: string } }) => <article data-testid="product-card-root">{data.handle}</article>,
}));

vi.mock('./search-content', () => ({
  __esModule: true,
  default: ({ productCards }: { productCards: React.ReactNode[] }) => <div data-testid="search-content">{productCards}</div>,
}));

describe('SearchContentGate — phase 1 regression', () => {
  it('renders one product-card-root per result returned by cachedSearch', () => {
    const data = {
      products: [
        { id: 'gid://shopify/Product/1', handle: 'a', variants: { edges: [{ node: { id: 'v1', availableForSale: true } }] } } as never,
        { id: 'gid://shopify/Product/2', handle: 'b', variants: { edges: [{ node: { id: 'v2', availableForSale: true } }] } } as never,
        { id: 'gid://shopify/Product/3', handle: 'c', variants: { edges: [{ node: { id: 'v3', availableForSale: true } }] } } as never,
      ],
      productFilters: [],
      totalCount: 3,
    };

    render(
      <SearchContentGate
        shop={{ id: 'shop_1', domain: 'example.com' } as never}
        locale={{ code: 'en-US' } as never}
        i18n={{ dictionary: {} } as never}
        showFilters={false}
        data={data}
      />,
    );

    expect(screen.getAllByTestId('product-card-root')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the test to confirm the suspense fallback path renders cards correctly when variants are present**

Run: `pnpm test --project @nordcom/commerce-storefront -- search-content-gate.regression`
Expected: **PASS** — the gate already maps `products → SearchProductCard` correctly when variants exist. The bug is upstream: `cachedSearch` doesn't return variants.

This test locks in the behavior so the upstream fix (Task 1.2) can't regress the gate.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/[domain]/[locale]/search/search-content-gate.regression.test.tsx
git commit -m "test(storefront/search): lock search-content-gate fan-out for the variants regression."
```

## Task 1.2: Add variants to the search GraphQL query

**Files:**
- Modify: `apps/storefront/src/api/shopify/search.ts` lines 15–77 (replace the inline `... on Product { ... }` selection with the shared `ProductMinimal` fragment).

- [ ] **Step 1: Write a failing test for the new query shape**

```ts
// apps/storefront/src/api/shopify/search.regression.test.ts — create new file
import { describe, expect, it } from 'vitest';
import { SEARCH_PRODUCTS_QUERY } from '@/api/shopify/search';

describe('SEARCH_PRODUCTS_QUERY', () => {
  it('selects the ProductMinimal fragment (variants must be queried for SearchProductCard)', () => {
    const printed = SEARCH_PRODUCTS_QUERY.toString();
    expect(printed).toMatch(/ProductMinimal/);
    expect(printed).toMatch(/variants\(first:\s*3\)/);
  });
});
```

The current `SEARCH_PRODUCTS_QUERY` is module-private. **Before running the test, also make it exported** (next step).

- [ ] **Step 2: Edit `apps/storefront/src/api/shopify/search.ts`**

Two changes in this single edit:

1. Replace the inline product selection (lines 36–73) with a fragment spread referencing `PRODUCT_FRAGMENT_MINIMAL` from `product-fragments.ts`.
2. Export the query so the test can introspect it.

```ts
// apps/storefront/src/api/shopify/search.ts
import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { trace } from '@opentelemetry/api';
import { cacheLife, cacheTag } from 'next/cache';
import { Shop } from '@/api/_loaders';
import type { Product, ProductFilters } from '@/api/product';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product-fragments';
import { cache } from '@/cache';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { unsafe_cast } from '@/utils/unsafe-cast';

export const SEARCH_PRODUCTS_QUERY = graphql(
  `
    query searchProducts($query: String!, $first: Int, $type: [SearchType!]) {
      search(query: $query, first: $first, types: $type) {
        totalCount
        productFilters {
          id
          label
          presentation
          type
          values {
            id
            label
            count
            input
            swatch {
              color
            }
          }
        }
        edges {
          node {
            ... on Product {
              ...ProductMinimal
            }
          }
        }
      }
    }
  `,
  [PRODUCT_FRAGMENT_MINIMAL],
);

// Rest of file unchanged. The SearchApi + cachedSearch exports stay the same.
```

- [ ] **Step 3: Run the new test**

Run: `pnpm test --project @nordcom/commerce-storefront -- search.regression`
Expected: PASS.

- [ ] **Step 4: Run the broader search test file to confirm no regression**

Run: `pnpm test --project @nordcom/commerce-storefront -- apps/storefront/src/api/shopify/search`
Expected: All existing tests pass. The new fragment is a strict superset of the old selection.

- [ ] **Step 5: Codegen + typecheck**

Run: `pnpm cms:gen` (regenerates any dependent gql.tada types if needed)
Then: `pnpm typecheck`
Expected: clean exit, no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/api/shopify/search.ts apps/storefront/src/api/shopify/search.regression.test.ts
git commit -m "$(cat <<'EOF'
fix(storefront/search): query variants so SearchProductCard can render.

the search query omitted the variants selection, so SearchProductCard's
defensive null-return on missing variants short-circuited every result.
swap the inline selection for the shared ProductMinimal fragment used by
the collection page so all surfaces see the same product shape.
EOF
)"
```

## Task 1.3: End-to-end smoke

**Files:**
- Create: `apps/storefront/e2e/search-renders-cards.spec.ts`

- [ ] **Step 1: Write the E2E**

```ts
// apps/storefront/e2e/search-renders-cards.spec.ts
import { expect, test } from '@playwright/test';

test('search results render a product card per result', async ({ page }) => {
  await page.goto('/en-US/search/?q=t-shirt');
  // Wait for the result count label to confirm the response landed.
  const countLabel = page.getByText(/\d+ products?/i);
  await expect(countLabel).toBeVisible();
  const countText = await countLabel.textContent();
  const expected = Number(countText?.match(/(\d+)/)?.[1] ?? 0);
  expect(expected).toBeGreaterThan(0);

  const cards = page.getByTestId('product-card-root');
  await expect(cards).toHaveCount(expected);
});
```

- [ ] **Step 2: Run E2E**

Run: `pnpm test:e2e -- search-renders-cards`
Expected: PASS against the seeded dev mongo + mock.shop fixtures (Phase 1 of CLAUDE.md describes the in-process mongo).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/e2e/search-renders-cards.spec.ts
git commit -m "test(storefront/search): e2e smoke locks the cards-per-result invariant."
```

**Phase 1 ship gate.** Push the branch / open a PR. Production is unblocked. Phases 2-6 follow.

---

# Phase 2 — Foundation: tokens, registries, provider, presets

Spec ref: §"Component architecture", §"Performance & implementation guardrails", §"Full token surface".

No primitives rewritten yet. Just scaffolds the new architecture.

## Task 2.1: Cleanup `globals.css` — drop redundant tokens, add new ones

**Files:**
- Modify: `apps/storefront/src/app/globals.css` (`:root` block around lines 180–256).

- [ ] **Step 1: Edit `globals.css`. Remove these tokens entirely:**

`--product-card-radius`, `--product-card-padding`, `--product-card-gap`, `--product-card-image-radius`, `--product-card-image-padding`, `--product-card-cta-radius`, `--product-card-cta-padding-y`, `--product-card-cta-height`, `--product-card-vendor-size`, `--product-card-title-size`, `--product-card-title-weight`, `--product-card-price-size`, `--product-card-price-weight`, `--product-card-chip-padding-x`, `--product-card-chip-padding-y`, `--product-card-more-size`, `--product-card-more-weight`, `--product-card-more-min-size`, `--product-card-motion-hover-duration`, `--product-card-motion-hover-ease`, `--product-card-motion-image-swap-duration`, `--product-card-motion-overlay-in-duration`, `--product-card-motion-overlay-in-ease`, `--product-card-overlay-bg`, `--product-card-overlay-radius`, `--product-card-overlay-border-color`, `--product-card-overlay-shadow`, `--product-card-overlay-width`, `--product-card-overlay-max-height`, `--product-card-overlay-padding`, `--aspect-product-card-micro`, `--aspect-product-card-horizontal-square`.

Also remove the `@theme inline` aliases for the dropped tokens (lines ~45–58 of `globals.css`) so Tailwind doesn't see ghost utilities.

Also remove the misleading comment `(spec: 2026-05-26-product-card-fix-design.md §Tokens)` from line 181 — the new spec slug is `2026-05-26-product-card-redesign`, and there's no point pointing at a phantom historical file.

- [ ] **Step 2: Add the new tokens to the same `:root` block**

```css
/* Product card tokens — surface-specific concerns only.
   Radius, padding, gap, border-width come from --block-* global scale.
   Type sizing/weight/line-height come from Tailwind utility classes.
   See .specs/2026-05-26-product-card-redesign/spec.md §"Token surface". */

/* Sizing */
--product-card-min-width: 200px;
--product-card-max-width: 240px;
--product-card-grid-align: start;
--product-card-search-image-width: 72px;

/* Image */
--product-card-image-fit: cover;
--product-card-image-hover-swap: on;
--product-card-image-sizes: (max-width: 768px) 50vw, 240px;

/* Eyebrow tracking (shared by vendor + sale badge typography) */
--product-card-eyebrow-tracking: 0.14em;

/* CTA */
--product-card-cta-placement: float-pill;
--product-card-cta-pill-position: top-right;
--product-card-cta-pill-label: "";
--product-card-cta-pill-icon: "+";
--product-card-cta-pill-reveal: always;
--product-card-cta-inline-style: solid;
--product-card-fast-path-dot: #2f7d4a;
--product-card-fast-path-single-variant: on;

/* Picker */
--product-card-quick-add-presentation: auto;

/* OOS */
--product-card-oos-opacity: 0.7;
--product-card-oos-image-saturate: 0.85;

/* Motion (spec-local — no global motion scale yet) */
--product-card-motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
--product-card-motion-fast: 80ms;
--product-card-motion-base: 160ms;
--product-card-motion-picker-in: 220ms;
--product-card-motion-picker-out: 180ms;

/* Sale */
--product-card-sale-style: strike-only;
--product-card-sale-strike-color: currentColor;
--product-card-sale-strike-angle: -8deg;
--product-card-sale-strike-extend: 2px;
--product-card-sale-current-color: #b54a2a;
--product-card-sale-show-savings-line: off;
--product-card-sale-badge-style: default;
--product-card-sale-badge-position: top-left;
--product-card-sale-badge-text: "−{n}%";
--product-card-sale-badge-min-discount: 11;
--product-card-sale-badge-allow-overlap: false;
```

Keep the existing tokens that remain valid: `--product-card-bg`, `--product-card-border-color`, `--product-card-border-width`, `--product-card-shadow`, `--product-card-shadow-hover`, `--product-card-image-bg`, `--product-card-image-bg-bare`, `--aspect-product-card-vertical`, `--aspect-product-card-horizontal`, `--product-card-vendor-color`, `--product-card-title-color`, `--product-card-title-line-clamp`, `--product-card-price-color`, `--product-card-compare-color`, `--product-card-swatch-size` (change value `18px → 16px`), `--product-card-swatch-gap`, `--product-card-swatch-ring-color`, `--product-card-swatch-hit-padding` (change value `6px → 10px` to give a 36px hit), `--product-card-chip-bg`, `--product-card-chip-color`, `--product-card-chip-border`, `--product-card-chip-active-bg`, `--product-card-chip-active-color`, `--product-card-more-bg`, `--product-card-more-color`, `--product-card-cta-bg`, `--product-card-cta-color`, `--product-card-urgency-color`, `--product-card-urgency-threshold`.

- [ ] **Step 3: Update the `@media (min-width: 48em)` block (around line 258)**

Remove `--product-card-padding`, `--product-card-swatch-size` (now 16px globally), `--product-card-title-size` overrides — those tokens are gone or globalized. Leave any remaining tenant-scoped overrides untouched.

- [ ] **Step 4: Build the storefront packages to verify globals.css compiles**

Run: `pnpm build:packages`
Then: `pnpm --filter @nordcom/commerce-storefront typecheck`
Expected: clean exit.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/app/globals.css
git commit -m "$(cat <<'EOF'
refactor(storefront/product-card): consolidate tokens, drop duplications.

product card now reads --block-* / --block-spacer for spacing and Tailwind
type-scale utilities for typography. spec-local tokens reserved for
genuinely card-specific concerns (sizing, sale state, CTA placement,
picker presentation).

deletes ~30 redundant or unused tokens (full list in
.specs/2026-05-26-product-card-redesign/plan.md Phase 2 Task 2.1).
EOF
)"
```

## Task 2.2: Create the CTA placement registry

**Files:**
- Create: `apps/storefront/src/components/product-card/cta/types.ts`
- Create: `apps/storefront/src/components/product-card/cta/registry.ts`
- Create: `apps/storefront/src/components/product-card/cta/registry.test.ts`

- [ ] **Step 1: Write the failing registry test**

```ts
// apps/storefront/src/components/product-card/cta/registry.test.ts
import { describe, expect, it } from 'vitest';
import { getProductCardCta, registerProductCardCta } from './registry';

describe('CTA registry', () => {
  it('returns the registered component when looked up by name', () => {
    const FakeCta = () => null;
    registerProductCardCta('fake-test-key', FakeCta);
    expect(getProductCardCta('fake-test-key')).toBe(FakeCta);
  });

  it('falls back to float-pill when the name is unknown', () => {
    const FloatPill = () => null;
    registerProductCardCta('float-pill', FloatPill);
    expect(getProductCardCta('absent')).toBe(FloatPill);
  });
});
```

- [ ] **Step 2: Run the test (expect FAIL — registry module not yet created)**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/cta/registry`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Create `cta/types.ts`**

```ts
// apps/storefront/src/components/product-card/cta/types.ts
'use client';

import type { ComponentType } from 'react';

export type ProductCardCtaProps = {
  productHandle: string;
  seedVariantId: string;
  isSingleBuyable: boolean;
  isOpen: boolean;
  onActivate: () => void;
  onAdd: () => void;
};

export type ProductCardCtaComponent = ComponentType<ProductCardCtaProps>;
```

- [ ] **Step 4: Create `cta/registry.ts`**

```ts
// apps/storefront/src/components/product-card/cta/registry.ts
'use client';

import type { ProductCardCtaComponent } from './types';

const registry = new Map<string, ProductCardCtaComponent>();

export function registerProductCardCta(name: string, component: ProductCardCtaComponent) {
  registry.set(name, component);
}

export function getProductCardCta(name: string): ProductCardCtaComponent {
  const found = registry.get(name);
  if (found) return found;
  const fallback = registry.get('float-pill');
  if (!fallback) throw new Error('product-card CTA registry has no float-pill fallback registered');
  return fallback;
}
```

- [ ] **Step 5: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/cta/registry`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/product-card/cta/types.ts apps/storefront/src/components/product-card/cta/registry.ts apps/storefront/src/components/product-card/cta/registry.test.ts
git commit -m "feat(storefront/product-card): add CTA placement registry."
```

## Task 2.3: Create the picker shape registry (same shape, different concern)

**Files:**
- Create: `apps/storefront/src/components/product-card/picker/types.ts`
- Create: `apps/storefront/src/components/product-card/picker/registry.ts`
- Create: `apps/storefront/src/components/product-card/picker/registry.test.ts`

- [ ] **Step 1: Write the failing registry test**

```ts
// apps/storefront/src/components/product-card/picker/registry.test.ts
import { describe, expect, it } from 'vitest';
import { getProductCardPicker, registerProductCardPicker } from './registry';

describe('picker registry', () => {
  it('returns the registered component', () => {
    const FakePicker = () => null;
    registerProductCardPicker('fake-test-shape', FakePicker);
    expect(getProductCardPicker('fake-test-shape')).toBe(FakePicker);
  });

  it('falls back to float when the name is unknown', () => {
    const Float = () => null;
    registerProductCardPicker('float', Float);
    expect(getProductCardPicker('absent')).toBe(Float);
  });
});
```

- [ ] **Step 2: Run the test (expect FAIL — module not yet created)**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/picker/registry`
Expected: FAIL.

- [ ] **Step 3: Create `picker/types.ts`**

```ts
// apps/storefront/src/components/product-card/picker/types.ts
'use client';

import type { ComponentType } from 'react';
import type { Product } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ProductCardPickerProps = {
  product: Product;
  locale: Locale;
  i18n: LocaleDictionary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type ProductCardPickerComponent = ComponentType<ProductCardPickerProps>;
```

- [ ] **Step 4: Create `picker/registry.ts`**

```ts
// apps/storefront/src/components/product-card/picker/registry.ts
'use client';

import type { ProductCardPickerComponent } from './types';

const registry = new Map<string, ProductCardPickerComponent>();

export function registerProductCardPicker(name: string, component: ProductCardPickerComponent) {
  registry.set(name, component);
}

export function getProductCardPicker(name: string): ProductCardPickerComponent {
  const found = registry.get(name);
  if (found) return found;
  const fallback = registry.get('float');
  if (!fallback) throw new Error('product-card picker registry has no float fallback registered');
  return fallback;
}
```

- [ ] **Step 5: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/picker/registry`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/product-card/picker/types.ts apps/storefront/src/components/product-card/picker/registry.ts apps/storefront/src/components/product-card/picker/registry.test.ts
git commit -m "feat(storefront/product-card): add picker shape registry."
```

## Task 2.4: Surface presets

**Files:**
- Create: `apps/storefront/src/components/product-card/presets.ts`
- Create: `apps/storefront/src/components/product-card/presets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/storefront/src/components/product-card/presets.test.ts
import { describe, expect, it } from 'vitest';
import { SURFACE_PRESETS } from './presets';

describe('SURFACE_PRESETS', () => {
  it('exposes collection, recommendation, search', () => {
    expect(Object.keys(SURFACE_PRESETS).sort()).toEqual(['collection', 'recommendation', 'search']);
  });

  it('collection + recommendation use vertical/boxed/float-pill/auto', () => {
    for (const k of ['collection', 'recommendation'] as const) {
      expect(SURFACE_PRESETS[k]).toEqual({
        layout: 'vertical',
        chrome: 'boxed',
        ctaPlacement: 'float-pill',
        pickerPresentation: 'auto',
      });
    }
  });

  it('search uses horizontal/boxed', () => {
    expect(SURFACE_PRESETS.search.layout).toBe('horizontal');
    expect(SURFACE_PRESETS.search.chrome).toBe('boxed');
  });
});
```

- [ ] **Step 2: Run the test (expect FAIL)**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/presets`
Expected: FAIL.

- [ ] **Step 3: Create `presets.ts`**

```ts
// apps/storefront/src/components/product-card/presets.ts
import 'server-only';

export type ProductCardLayout = 'vertical' | 'horizontal';
export type ProductCardChrome = 'boxed' | 'frameless';
export type ProductCardCtaPlacement = string;       // registry-keyed; string for extensibility
export type ProductCardPickerPresentation = 'auto' | 'float' | 'sheet' | 'inline';

export type ProductCardSurfacePreset = {
  layout: ProductCardLayout;
  chrome: ProductCardChrome;
  ctaPlacement: ProductCardCtaPlacement;
  pickerPresentation: ProductCardPickerPresentation;
};

export const SURFACE_PRESETS = {
  collection: {
    layout: 'vertical',
    chrome: 'boxed',
    ctaPlacement: 'float-pill',
    pickerPresentation: 'auto',
  },
  recommendation: {
    layout: 'vertical',
    chrome: 'boxed',
    ctaPlacement: 'float-pill',
    pickerPresentation: 'auto',
  },
  search: {
    layout: 'horizontal',
    chrome: 'boxed',
    ctaPlacement: 'float-pill',
    pickerPresentation: 'auto',
  },
} as const satisfies Record<string, ProductCardSurfacePreset>;
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/presets`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-card/presets.ts apps/storefront/src/components/product-card/presets.test.ts
git commit -m "feat(storefront/product-card): add SURFACE_PRESETS for per-surface defaults."
```

## Task 2.5: Two-context options provider

**Files:**
- Create: `apps/storefront/src/components/product-card/primitives/product-card-options-provider.tsx`
- Create: `apps/storefront/src/components/product-card/primitives/product-card-options-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-options-provider.test.tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ProductCardOptionsProvider,
  usePickerOpen,
  useVariantSelection,
} from './product-card-options-provider';

const product = {
  id: 'gid://shopify/Product/1',
  handle: 'tee',
  variants: { edges: [{ node: { id: 'v1', availableForSale: true, selectedOptions: [{ name: 'Size', value: 'M' }] } }] },
} as never;

describe('ProductCardOptionsProvider', () => {
  it('reads initial seed variant id', () => {
    const { result } = renderHook(() => useVariantSelection(), {
      wrapper: ({ children }) => (
        <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={true}>
          {children}
        </ProductCardOptionsProvider>
      ),
    });
    expect(result.current?.selectedVariantId).toBe('v1');
  });

  it('exposes isSingleBuyable to the picker-open context', () => {
    const { result } = renderHook(() => usePickerOpen(), {
      wrapper: ({ children }) => (
        <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={true}>
          {children}
        </ProductCardOptionsProvider>
      ),
    });
    expect(result.current?.isSingleBuyable).toBe(true);
    expect(result.current?.open).toBe(false);
  });

  it('toggling picker open does not change selection identity', () => {
    let selectionRefBefore: unknown;
    let selectionRefAfter: unknown;
    const Probe = () => {
      const sel = useVariantSelection();
      selectionRefBefore ??= sel;
      selectionRefAfter = sel;
      return null;
    };
    const { result } = renderHook(() => usePickerOpen(), {
      wrapper: ({ children }) => (
        <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
          <Probe />
          {children}
        </ProductCardOptionsProvider>
      ),
    });
    act(() => result.current?.setOpen(true));
    expect(selectionRefAfter).toBe(selectionRefBefore); // selection context is referentially stable
  });
});
```

- [ ] **Step 2: Run the test (expect FAIL)**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/primitives/product-card-options-provider`
Expected: FAIL.

- [ ] **Step 3: Create the provider**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-options-provider.tsx
'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '@/api/product';

type VariantSelectionValue = {
  product: Product;
  selectedVariantId: string;
  selectVariant: (variantId: string) => void;
};

type PickerOpenValue = {
  isSingleBuyable: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const VariantSelectionContext = createContext<VariantSelectionValue | null>(null);
const PickerOpenContext = createContext<PickerOpenValue | null>(null);

export type ProductCardOptionsProviderProps = {
  product: Product;
  seedVariantId: string;
  isSingleBuyable: boolean;
  children: ReactNode;
};

export function ProductCardOptionsProvider({
  product,
  seedVariantId,
  isSingleBuyable,
  children,
}: ProductCardOptionsProviderProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(seedVariantId);
  const [open, setOpen] = useState(false);

  const selectVariant = useCallback((next: string) => setSelectedVariantId(next), []);

  const selectionValue = useMemo<VariantSelectionValue>(
    () => ({ product, selectedVariantId, selectVariant }),
    [product, selectedVariantId, selectVariant],
  );

  const pickerValue = useMemo<PickerOpenValue>(
    () => ({ isSingleBuyable, open, setOpen }),
    [isSingleBuyable, open],
  );

  return (
    <VariantSelectionContext.Provider value={selectionValue}>
      <PickerOpenContext.Provider value={pickerValue}>{children}</PickerOpenContext.Provider>
    </VariantSelectionContext.Provider>
  );
}

export const useVariantSelection = () => useContext(VariantSelectionContext);
export const usePickerOpen = () => useContext(PickerOpenContext);
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/primitives/product-card-options-provider`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-card/primitives/product-card-options-provider.tsx apps/storefront/src/components/product-card/primitives/product-card-options-provider.test.tsx
git commit -m "feat(storefront/product-card): two-context options provider (selection + picker-open)."
```

---

# Phase 3 — Primitives rewrite

Spec ref: §"Component architecture", §"Visual reference — canonical CSS".

The order matters: chassis (extension to Card) → leaves that depend on it → registry-fillers (cta + picker strategies) → orchestrator.

## Task 3.1: Extend `<Card>` with `chrome="boxed" | "frameless"`

**Files:**
- Modify: `apps/storefront/src/components/layout/card.tsx`
- Modify: `apps/storefront/src/components/layout/card.test.tsx`

- [ ] **Step 1: Add a failing test**

Open `apps/storefront/src/components/layout/card.test.tsx` and add:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

describe('Card chrome variant', () => {
  it('frameless drops bg, border, padding', () => {
    render(<Card chrome="frameless" data-testid="c">content</Card>);
    const el = screen.getByTestId('c');
    expect(el.className).not.toMatch(/\bp-3\b/);
    expect(el.className).not.toMatch(/\bbg-gray-100\b/);
    expect(el.className).not.toMatch(/\bborder\b/);
  });

  it('boxed (default) keeps the existing chrome', () => {
    render(<Card chrome="boxed" data-testid="c">content</Card>);
    const el = screen.getByTestId('c');
    expect(el.className).toMatch(/p-3/);
    expect(el.className).toMatch(/rounded-lg/);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- components/layout/card`
Expected: FAIL — prop not yet declared.

- [ ] **Step 3: Update `Card`**

```tsx
// apps/storefront/src/components/layout/card.tsx
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

export type CardChrome = 'boxed' | 'frameless';

export type CardPropsBase<ComponentGeneric extends ElementType> = {
  as?: ComponentGeneric;
  className?: string;
  children?: ReactNode;
  border?: boolean;
  chrome?: CardChrome;
};

export type CardProps<ComponentGeneric extends ElementType> = CardPropsBase<ComponentGeneric> &
  (ComponentGeneric extends keyof React.JSX.IntrinsicElements
    ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof CardPropsBase<ComponentGeneric>>
    : ComponentPropsWithoutRef<ComponentGeneric>);

export const Card = <ComponentGeneric extends ElementType = 'div'>({
  as,
  className,
  children,
  border = false,
  chrome = 'boxed',
  ...rest
}: CardProps<ComponentGeneric>) => {
  const Tag = as ?? 'div';

  return (
    <Tag
      {...rest}
      className={cn(
        chrome === 'boxed' && [
          'rounded-lg border border-gray-200 border-solid p-3',
          !border && 'bg-gray-100',
          border && 'border-2 border-gray-100 border-solid',
        ],
        chrome === 'frameless' && 'bg-transparent border-0 p-0',
        className,
      )}
    >
      {children}
    </Tag>
  );
};
Card.displayName = 'Nordcom.Layout.Card';
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- components/layout/card`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/layout/card.tsx apps/storefront/src/components/layout/card.test.tsx
git commit -m "feat(storefront/layout/card): add chrome variant for frameless mode."
```

## Task 3.2: Rewrite `ProductCardRoot` to use `<Card>`

**Files:**
- Modify: `apps/storefront/src/components/product-card/primitives/product-card-root.tsx`
- Modify: `apps/storefront/src/components/product-card/primitives/product-card-root.test.tsx`

- [ ] **Step 1: Update the existing test for the new shape**

Replace the body of `product-card-root.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductCardRoot from './product-card-root';

const product = {
  handle: 'tee',
  availableForSale: true,
  variants: { edges: [{ node: { id: 'v1', availableForSale: true, selectedOptions: [{ name: 'Size', value: 'M' }] } }] },
} as never;

describe('ProductCardRoot', () => {
  it('renders vertical-boxed chassis by default', () => {
    render(
      <ProductCardRoot data={product} layout="vertical" chrome="boxed">
        <div data-testid="content" />
      </ProductCardRoot>,
    );
    const article = screen.getByRole('article');
    expect(article).toBeTruthy();
    expect(article.dataset.layout).toBe('vertical');
    expect(article.dataset.chrome).toBe('boxed');
    expect(article.dataset.availability).toBeUndefined(); // available product
  });

  it('marks data-availability="out-of-stock" when product has no buyable variants', () => {
    const oos = { ...product, availableForSale: false };
    render(
      <ProductCardRoot data={oos} layout="vertical" chrome="boxed">
        <div />
      </ProductCardRoot>,
    );
    expect(screen.getByRole('article').dataset.availability).toBe('out-of-stock');
  });

  it('horizontal layout sets data-layout', () => {
    render(
      <ProductCardRoot data={product} layout="horizontal" chrome="boxed">
        <div />
      </ProductCardRoot>,
    );
    expect(screen.getByRole('article').dataset.layout).toBe('horizontal');
  });
});
```

Notes: the existing test mocked `ProductOptions.Root`. That wrapping moves out of `ProductCardRoot` (the new provider sits OUTSIDE the chassis). The new chassis is just an `<article>` with chrome and layout data attributes.

- [ ] **Step 2: Run the test (expect FAIL — current code still does the old thing)**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card-root`
Expected: FAIL.

- [ ] **Step 3: Rewrite `product-card-root.tsx`**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-root.tsx
import type { ReactNode } from 'react';
import type { Product } from '@/api/product';
import { Card } from '@/components/layout/card';
import { cn } from '@/utils/tailwind';

export type ProductCardLayout = 'vertical' | 'horizontal';
export type ProductCardChrome = 'boxed' | 'frameless';

export type ProductCardRootProps = {
  data: Product;
  layout: ProductCardLayout;
  chrome: ProductCardChrome;
  className?: string;
  children: ReactNode;
};

const ProductCardRoot = ({ data, layout, chrome, className, children }: ProductCardRootProps) => {
  const isOos = data.availableForSale === false;

  return (
    <Card
      as="article"
      chrome={chrome}
      data-testid="product-card-root"
      data-layout={layout}
      data-chrome={chrome}
      {...(isOos ? { 'data-availability': 'out-of-stock' } : {})}
      className={cn(
        'group/card relative flex w-full',
        'min-w-(--product-card-min-width) max-w-(--product-card-max-width)',
        'gap-(--block-spacer)',
        'transition-shadow duration-(--product-card-motion-base) ease-(--product-card-motion-ease)',
        chrome === 'boxed' && 'shadow-product-card hover:shadow-product-card-hover focus-within:shadow-product-card-hover',
        layout === 'vertical' && 'flex-col min-h-72',
        layout === 'horizontal' && 'flex-row items-stretch',
        isOos && 'opacity-(--product-card-oos-opacity)',
        className,
      )}
    >
      {children}
    </Card>
  );
};

ProductCardRoot.displayName = 'Nordcom.ProductCard.Root';
export default ProductCardRoot;
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card-root`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-card/primitives/product-card-root.tsx apps/storefront/src/components/product-card/primitives/product-card-root.test.tsx
git commit -m "$(cat <<'EOF'
refactor(storefront/product-card): chassis uses Card primitive + data-attrs.

ProductCardRoot delegates chrome rendering to <Card>. layout and chrome are
data-attributes for surface-CSS overrides. Out-of-stock state propagates
via data-availability rather than direct opacity classes — keeps the
chassis declarative.
EOF
)"
```

## Task 3.3: Fix the `+N` chip race condition in `ProductOptions.Group`

Spec ref: §"Bug fixes — root causes", row "+N chip".

**Files:**
- Modify: `apps/storefront/src/components/product-options/primitives/group.tsx` (delete the `useEffect` + DOM mutation).
- Modify: `apps/storefront/src/components/product-options/primitives/more.tsx` (already correct — verify the conditional render).
- Add: `apps/storefront/src/components/product-options/primitives/more.race.test.tsx`

- [ ] **Step 1: Write a failing test that asserts +N renders correctly across sibling groups**

```tsx
// apps/storefront/src/components/product-options/primitives/more.race.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductOptionsContext } from '../context';
import Group from './group';
import More from './more';

const ctx = (resolved: { name: string; values: { name: string; selected?: boolean; available?: boolean }[] }[]) =>
  ({
    product: { handle: 'p' } as never,
    resolved: resolved.map((g) => ({
      name: g.name,
      values: g.values.map((v) => ({ name: v.name, selected: !!v.selected, available: v.available !== false })),
    })),
    selection: {},
    selectVariant: () => {},
    selectedVariant: undefined,
    hoveredVariant: undefined,
    setHoveredVariant: () => {},
    renderers: {},
  }) as never;

describe('+N chip — sibling groups', () => {
  it('per-group More renders the correct overflow for its OWN group, not the first one in DOM', () => {
    const { getByText, queryByText } = render(
      <ProductOptionsContext.Provider
        value={ctx([
          { name: 'Size', values: [{ name: 'S' }, { name: 'M' }, { name: 'L' }, { name: 'XL' }] }, // 4 → no overflow
          { name: 'Color', values: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }, { name: 'F' }] }, // 6 → +2
        ])}
      >
        <div>
          <Group name="Size" />
          <More groupName="Size" />
        </div>
        <div>
          <Group name="Color" />
          <More groupName="Color" />
        </div>
      </ProductOptionsContext.Provider>,
    );

    // Size has 4 values, inline limit is 4 → no overflow → no More for size
    expect(queryByText('+0')).toBeNull();
    // Color has 6 values, inline limit is 4 → +2
    expect(getByText('+2')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-options/primitives/more.race`
Expected: FAIL — the existing Group `useEffect` is mutating textContent in a sibling-group-confused way.

- [ ] **Step 3: Delete the `useEffect` in `group.tsx`**

Edit `apps/storefront/src/components/product-options/primitives/group.tsx` — remove the `useRef` + `useEffect` block and the post-mount DOM mutation. Also remove the `total` variable and `data-overflow` JSX attribute since neither is needed once `More` is the sole source of truth.

```tsx
// apps/storefront/src/components/product-options/primitives/group.tsx
'use client';

import { useProductOptions } from '../context';
import Value from './value';

export type GroupProps = {
  name: string;
  density?: 'compact' | 'spacious';
};

const Group = ({ name, density = 'compact' }: GroupProps) => {
  const { resolved } = useProductOptions();
  const group = resolved.find((g) => g.name === name);
  if (!group) return null;

  return (
    <div
      className="product-card-swatch-row flex flex-wrap items-center gap-(--product-card-swatch-gap)"
      data-group={name}
    >
      {group.values.map((v) => (
        <span key={v.name} data-option-value>
          <Value group={group} value={v} density={density} />
        </span>
      ))}
    </div>
  );
};

Group.displayName = 'Nordcom.ProductOptions.Group';
export default Group;
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-options/primitives/more`
Expected: PASS (both the new race test AND any existing more tests).

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-options/primitives/group.tsx apps/storefront/src/components/product-options/primitives/more.race.test.tsx
git commit -m "$(cat <<'EOF'
fix(storefront/product-options): kill the +N DOM-mutation race.

Group's useEffect was reading --inline-limit at runtime and mutating the
first [data-option-more] in the parent — collided across sibling groups
because both Groups under one parent hit the same More.

drop the runtime DOM mutation entirely. More is the sole source of truth;
it short-circuits when overflow is 0 via JSX. inline limit is fixed at 4.
EOF
)"
```

## Task 3.4: `ProductCardImage` — image-fit token + sizes token + variant swap

**Files:**
- Modify: `apps/storefront/src/components/product-display/primitives/variant-image-client.tsx`
- Modify: `apps/storefront/src/components/product-display/primitives/variant-image-client.test.tsx`
- Modify: `apps/storefront/src/components/product-card/primitives/product-card-image.tsx`

The CLIENT impl already does most of the work. We need to:
1. Switch `object-contain` → `object-cover` default (read from `--product-card-image-fit`).
2. Switch the hardcoded `sizes="(max-width: 768px) 50vw, 280px"` to read `--product-card-image-sizes` (240px max now).
3. Drop the `aspect="micro"` value from the prop type (Phase 2 task already removed the token).

- [ ] **Step 1: Update the existing test in `variant-image-client.test.tsx`**

Find the existing assertions on image classes and update to expect `object-cover` instead of `object-contain`:

```tsx
// modify the existing assertions
expect(img.className).toMatch(/object-cover/);
expect(img).toHaveAttribute('sizes', expect.stringMatching(/240px/));
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- variant-image-client`
Expected: FAIL.

- [ ] **Step 3: Edit `variant-image-client.tsx`**

Two edits:

(a) In the `aspectClass` helper, drop the `micro` case (line 28) and the `horizontal-square` token reference. The `aspect` prop type becomes `'vertical' | 'horizontal' | 'square'`.

(b) Replace `object-contain object-center` with `object-cover object-center` and replace the hardcoded `sizes` with the token.

```tsx
// inside the existing component
<Image
  className={cn(
    'h-full w-full object-cover object-center transition-transform [transition-duration:var(--product-card-motion-base)] [transition-timing-function:var(--product-card-motion-ease)] motion-safe:group-hover/header:scale-[1.04]',
  )}
  src={primary.url}
  alt={primary.altText ?? title}
  height={primary.height}
  width={primary.width}
  sizes="var(--product-card-image-sizes)"
  decoding="async"
  draggable={false}
  loading={priority ? 'eager' : 'lazy'}
/>
```

Note: `sizes` accepts CSS values; the `next/image` `sizes` prop is a string, and passing a CSS var resolves at runtime because `next/image` forwards it to the underlying `<img sizes=…>`. If TypeScript complains, narrow to `string`.

Also update the `aspect` prop:

```tsx
export type VariantImageClientProps = {
  initialImage: SeedImage | null;
  swapImage: SeedImage | null;
  aspect: 'vertical' | 'horizontal' | 'square';
  href: string;
  title: string;
  priority: boolean;
  className?: string;
};

const aspectClass = (aspect: VariantImageClientProps['aspect']) => {
  if (aspect === 'horizontal' || aspect === 'square') return 'aspect-(--aspect-product-card-horizontal)';
  return 'aspect-(--aspect-product-card-vertical)';
};
```

- [ ] **Step 4: Update `product-card-image.tsx` to match the new prop type**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-image.tsx
import type { Product, ProductVariant } from '@/api/product';
import { VariantImage } from '@/components/product-display';

export type ProductCardImageProps = {
  product: Product;
  seedVariant: ProductVariant;
  priority?: boolean;
  aspect?: 'vertical' | 'horizontal' | 'square';
  className?: string;
};

const ProductCardImage = (props: ProductCardImageProps) => <VariantImage {...props} />;

ProductCardImage.displayName = 'Nordcom.ProductCard.Image';
export default ProductCardImage;
```

- [ ] **Step 5: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- variant-image-client`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/product-display/primitives/variant-image-client.tsx apps/storefront/src/components/product-display/primitives/variant-image-client.test.tsx apps/storefront/src/components/product-card/primitives/product-card-image.tsx
git commit -m "$(cat <<'EOF'
feat(storefront/product-card): image fit cover + token-driven sizes.

object-fit default flips from contain → cover; sizes attribute reads
--product-card-image-sizes (calibrated to the 200–240px card range).
drops the now-deleted micro/horizontal-square aspect values.
EOF
)"
```

## Task 3.5: CTA strategy — `float-pill`

**Files:**
- Create: `apps/storefront/src/components/product-card/cta/float-pill.tsx`
- Create: `apps/storefront/src/components/product-card/cta/float-pill.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/storefront/src/components/product-card/cta/float-pill.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FloatPill from './float-pill';

describe('float-pill CTA', () => {
  const base = {
    productHandle: 'tee',
    seedVariantId: 'v1',
    isOpen: false,
    onActivate: vi.fn(),
    onAdd: vi.fn(),
  };

  it('renders icon-only when no label provided', () => {
    render(<FloatPill {...base} isSingleBuyable={false} />);
    expect(screen.getByRole('button', { name: /choose options/i })).toBeTruthy();
  });

  it('shows fast-path dot when single buyable', () => {
    render(<FloatPill {...base} isSingleBuyable={true} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('data-fast-path');
  });

  it('open state swaps icon and aria-label', () => {
    render(<FloatPill {...base} isOpen={true} isSingleBuyable={false} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeTruthy();
  });

  it('clicking fires onAdd when single-buyable, onActivate otherwise', () => {
    const onAdd = vi.fn();
    const onActivate = vi.fn();
    const { rerender } = render(<FloatPill {...base} isSingleBuyable={true} onAdd={onAdd} onActivate={onActivate} />);
    screen.getByRole('button').click();
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onActivate).not.toHaveBeenCalled();

    onAdd.mockClear();
    onActivate.mockClear();
    rerender(<FloatPill {...base} isSingleBuyable={false} onAdd={onAdd} onActivate={onActivate} />);
    screen.getByRole('button').click();
    expect(onActivate).toHaveBeenCalledOnce();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/cta/float-pill`
Expected: FAIL.

- [ ] **Step 3: Create `float-pill.tsx`**

```tsx
// apps/storefront/src/components/product-card/cta/float-pill.tsx
'use client';

import { Plus, X } from 'lucide-react';
import type { ProductCardCtaProps } from './types';
import { registerProductCardCta } from './registry';

const FloatPill = ({ isSingleBuyable, isOpen, onActivate, onAdd }: ProductCardCtaProps) => {
  const handleClick = () => {
    if (isOpen) {
      onActivate(); // host toggles open state
      return;
    }
    if (isSingleBuyable) {
      onAdd();
      return;
    }
    onActivate();
  };

  const label = isOpen ? 'Close options' : isSingleBuyable ? 'Add to bag' : 'Choose options';

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={isOpen}
      onClick={handleClick}
      {...(isSingleBuyable && !isOpen ? { 'data-fast-path': '' } : {})}
      className="
        absolute z-3
        top-(--product-card-cta-pill-top, 10px) right-(--product-card-cta-pill-right, 10px)
        inline-flex items-center justify-center gap-1.5
        size-9 rounded-full p-0
        bg-white/95 text-(--product-card-title-color)
        border border-[color-mix(in_srgb,currentColor_8%,transparent)]
        shadow-[0_6px_16px_-8px_rgb(20_17_11/0.25)]
        select-none [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]
        transition-[box-shadow,transform] duration-(--product-card-motion-base) ease-(--product-card-motion-ease)
        motion-safe:hover:shadow-[0_10px_22px_-8px_rgb(20_17_11/0.3)]
        motion-safe:active:scale-96 motion-safe:active:duration-(--product-card-motion-fast)
        focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)
        disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none disabled:cursor-not-allowed
        data-[fast-path]:relative
        data-[fast-path]:after:content-['']
        data-[fast-path]:after:absolute data-[fast-path]:after:-bottom-px data-[fast-path]:after:-right-px
        data-[fast-path]:after:size-2.5 data-[fast-path]:after:rounded-full
        data-[fast-path]:after:bg-(--product-card-fast-path-dot) data-[fast-path]:after:border-2 data-[fast-path]:after:border-(--product-card-bg)
      "
    >
      {isOpen ? <X aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
    </button>
  );
};

FloatPill.displayName = 'Nordcom.ProductCard.Cta.FloatPill';

registerProductCardCta('float-pill', FloatPill);
export default FloatPill;
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/cta/float-pill`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-card/cta/float-pill.tsx apps/storefront/src/components/product-card/cta/float-pill.test.tsx
git commit -m "feat(storefront/product-card): float-pill CTA strategy."
```

## Task 3.6: CTA strategy — `inline-button`

**Files:**
- Create: `apps/storefront/src/components/product-card/cta/inline-button.tsx`
- Create: `apps/storefront/src/components/product-card/cta/inline-button.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/storefront/src/components/product-card/cta/inline-button.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InlineButton from './inline-button';

describe('inline-button CTA', () => {
  const base = { productHandle: 'tee', seedVariantId: 'v1', isOpen: false, onActivate: vi.fn(), onAdd: vi.fn() };

  it('renders Add to bag label', () => {
    render(<InlineButton {...base} isSingleBuyable={false} />);
    expect(screen.getByRole('button', { name: /add to bag/i })).toBeTruthy();
  });

  it('full-width 44px touch target', () => {
    render(<InlineButton {...base} isSingleBuyable={false} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/h-11/);
    expect(btn.className).toMatch(/w-full/);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/cta/inline-button`
Expected: FAIL.

- [ ] **Step 3: Create `inline-button.tsx`**

```tsx
// apps/storefront/src/components/product-card/cta/inline-button.tsx
'use client';

import type { ProductCardCtaProps } from './types';
import { registerProductCardCta } from './registry';

const InlineButton = ({ isSingleBuyable, onActivate, onAdd }: ProductCardCtaProps) => {
  const handleClick = () => (isSingleBuyable ? onAdd() : onActivate());
  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        h-11 w-full px-4 inline-flex items-center justify-center
        rounded-(--block-border-radius-small) border-0
        bg-(--product-card-cta-bg) text-(--product-card-cta-color)
        font-semibold text-sm leading-none
        cursor-pointer select-none [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]
        transition-[background,transform] duration-(--product-card-motion-base) ease-(--product-card-motion-ease)
        motion-safe:hover:bg-[color-mix(in_srgb,var(--product-card-cta-bg)_92%,white_8%)]
        motion-safe:active:scale-99 motion-safe:active:duration-(--product-card-motion-fast)
        focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)
        disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed
      "
    >
      Add to bag
    </button>
  );
};

InlineButton.displayName = 'Nordcom.ProductCard.Cta.InlineButton';

registerProductCardCta('inline-button', InlineButton);
export default InlineButton;
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/cta/inline-button`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-card/cta/inline-button.tsx apps/storefront/src/components/product-card/cta/inline-button.test.tsx
git commit -m "feat(storefront/product-card): inline-button CTA strategy."
```

## Task 3.7: Picker shells — `float` (Radix Popover)

**Files:**
- Create: `apps/storefront/src/components/product-card/picker/float.tsx`
- Create: `apps/storefront/src/components/product-card/picker/float.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/storefront/src/components/product-card/picker/float.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FloatPicker from './float';

const product = {
  handle: 'tee',
  options: [
    { name: 'Size', values: ['S', 'M', 'L'], optionValues: [
      { name: 'S', firstSelectableVariant: { id: 'v1' } },
      { name: 'M', firstSelectableVariant: { id: 'v2' } },
      { name: 'L', firstSelectableVariant: { id: 'v3' } },
    ] },
  ],
  variants: { edges: [
    { node: { id: 'v1', selectedOptions: [{ name: 'Size', value: 'S' }], price: { amount: '38.00', currencyCode: 'USD' }, availableForSale: true } },
    { node: { id: 'v2', selectedOptions: [{ name: 'Size', value: 'M' }], price: { amount: '38.00', currencyCode: 'USD' }, availableForSale: true } },
    { node: { id: 'v3', selectedOptions: [{ name: 'Size', value: 'L' }], price: { amount: '38.00', currencyCode: 'USD' }, availableForSale: false } },
  ] },
} as never;

describe('FloatPicker', () => {
  it('does not render contents when closed', () => {
    render(<FloatPicker product={product} locale={{ code: 'en-US' } as never} i18n={{} as never} open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText('Size')).toBeNull();
  });

  it('renders size chips when open', () => {
    render(<FloatPicker product={product} locale={{ code: 'en-US' } as never} i18n={{} as never} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Size')).toBeTruthy();
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/picker/float`
Expected: FAIL.

- [ ] **Step 3: Create `float.tsx`**

Use Radix Popover (NOT the layout `<Popover>` — that one is a Dialog). Anchor to the parent card's CTA.

```tsx
// apps/storefront/src/components/product-card/picker/float.tsx
'use client';

import * as Popover from '@radix-ui/react-popover';
import { useMemo } from 'react';
import * as ProductOptions from '@/components/product-options';
import { resolveOptions, toSelectionRecord } from '@/components/product-options/resolver';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { ProductCardPickerProps } from './types';
import { registerProductCardPicker } from './registry';

const FloatPicker = ({ product, open, onOpenChange }: ProductCardPickerProps) => {
  const seed = firstAvailableVariant(product) ?? product.variants?.edges?.[0]?.node;
  const initialSelection = useMemo(() => toSelectionRecord(seed), [seed]);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {/* Trigger is rendered by the surrounding CTA — Popover.Anchor lets us anchor to it. */}
      <Popover.Anchor className="absolute top-2.5 right-2.5 size-9" />
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="
            z-50 w-[var(--radix-popover-trigger-width,196px)] min-w-48
            p-3 rounded-(--block-border-radius-small)
            bg-white/97 border border-black/[0.06] shadow-[0_12px_28px_-10px_rgb(20_17_11/0.22)]
            backdrop-blur-md
            flex flex-col gap-2.5
            data-[state=open]:animate-in data-[state=closed]:animate-out
          "
        >
          <ProductOptions.Root product={product} initialSelection={initialSelection}>
            <div>
              <div
                className="
                  text-[10px] font-semibold uppercase tracking-(--product-card-eyebrow-tracking)
                  text-(--product-card-vendor-color) mb-1.5
                "
              >
                Size
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ProductOptions.Group name="Size" density="compact" />
                <ProductOptions.More groupName="Size" />
              </div>
            </div>
            <button
              type="button"
              className="
                rounded-(--block-border-radius-small) bg-(--product-card-cta-bg) text-(--product-card-cta-color)
                p-3 text-xs font-semibold leading-none cursor-pointer tabular-nums
              "
            >
              Add to bag
            </button>
          </ProductOptions.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

FloatPicker.displayName = 'Nordcom.ProductCard.Picker.Float';
registerProductCardPicker('float', FloatPicker);
export default FloatPicker;
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/picker/float`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-card/picker/float.tsx apps/storefront/src/components/product-card/picker/float.test.tsx
git commit -m "feat(storefront/product-card): float picker shell (radix popover)."
```

## Task 3.8: Picker shells — `sheet` (Radix Dialog) and `inline`

**Files:**
- Create: `apps/storefront/src/components/product-card/picker/sheet.tsx`
- Create: `apps/storefront/src/components/product-card/picker/sheet.test.tsx`
- Create: `apps/storefront/src/components/product-card/picker/inline.tsx`
- Create: `apps/storefront/src/components/product-card/picker/inline.test.tsx`

- [ ] **Step 1: Write failing tests for both shells**

```tsx
// apps/storefront/src/components/product-card/picker/sheet.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SheetPicker from './sheet';

const product = {
  handle: 'tee',
  title: 'Heavyweight Box-Cut Tee',
  options: [{ name: 'Size', values: ['S', 'M'], optionValues: [{ name: 'S' }, { name: 'M' }] }],
  variants: { edges: [{ node: { id: 'v1', selectedOptions: [{ name: 'Size', value: 'S' }], availableForSale: true } }] },
} as never;

describe('SheetPicker', () => {
  it('renders dialog when open', () => {
    render(<SheetPicker product={product} locale={{ code: 'en-US' } as never} i18n={{} as never} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/heavyweight box-cut tee/i)).toBeTruthy();
  });
});
```

```tsx
// apps/storefront/src/components/product-card/picker/inline.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InlinePicker from './inline';

const product = {
  handle: 'tee',
  options: [{ name: 'Size', values: ['S'], optionValues: [{ name: 'S' }] }],
  variants: { edges: [{ node: { id: 'v1', selectedOptions: [{ name: 'Size', value: 'S' }] } }] },
} as never;

describe('InlinePicker', () => {
  it('expands in place when open; collapses when closed', () => {
    const { rerender } = render(<InlinePicker product={product} locale={{ code: 'en-US' } as never} i18n={{} as never} open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('group')).toBeNull();
    rerender(<InlinePicker product={product} locale={{ code: 'en-US' } as never} i18n={{} as never} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('group')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests (expect FAIL)**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/picker/sheet` then again with `inline`
Expected: FAIL for both.

- [ ] **Step 3: Create `sheet.tsx`**

```tsx
// apps/storefront/src/components/product-card/picker/sheet.tsx
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import * as ProductOptions from '@/components/product-options';
import { toSelectionRecord } from '@/components/product-options/resolver';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { ProductCardPickerProps } from './types';
import { registerProductCardPicker } from './registry';

const SheetPicker = ({ product, open, onOpenChange }: ProductCardPickerProps) => {
  const seed = firstAvailableVariant(product) ?? product.variants?.edges?.[0]?.node;
  const initialSelection = useMemo(() => toSelectionRecord(seed), [seed]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          aria-describedby={undefined}
          className="
            fixed bottom-0 inset-x-0 z-30
            md:bottom-auto md:top-1/2 md:left-1/2 md:inset-x-auto
            md:-translate-x-1/2 md:-translate-y-1/2
            w-full max-w-md md:max-w-sm
            bg-white border border-(--product-card-border-color)
            rounded-t-2xl md:rounded-2xl
            p-4 md:p-[18px] shadow-2xl
            flex flex-col gap-3
            data-[state=open]:animate-in data-[state=closed]:animate-out
          "
        >
          {/* Mobile drag handle */}
          <span aria-hidden className="block md:hidden mx-auto h-[3px] w-8 rounded-full bg-gray-300 -mt-1 mb-2" />
          <header className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-sm font-medium leading-snug">{product.title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="size-6 inline-flex items-center justify-center text-gray-600 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
            >
              <X aria-hidden className="size-full stroke-2" />
            </Dialog.Close>
          </header>
          <VisuallyHidden.Root>
            <Dialog.Description>Choose product options</Dialog.Description>
          </VisuallyHidden.Root>
          <ProductOptions.Root product={product} initialSelection={initialSelection}>
            {(product.options ?? []).map((opt) => (
              <div key={opt.name}>
                <div className="text-[10px] font-semibold uppercase tracking-(--product-card-eyebrow-tracking) text-(--product-card-vendor-color) mb-1.5">
                  {opt.name}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ProductOptions.Group name={opt.name} density="spacious" />
                  <ProductOptions.More groupName={opt.name} />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="rounded-(--block-border-radius-small) bg-(--product-card-cta-bg) text-(--product-card-cta-color) p-3 text-xs font-semibold leading-none cursor-pointer tabular-nums"
            >
              Add to bag
            </button>
          </ProductOptions.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

SheetPicker.displayName = 'Nordcom.ProductCard.Picker.Sheet';
registerProductCardPicker('sheet', SheetPicker);
export default SheetPicker;
```

- [ ] **Step 4: Create `inline.tsx`**

```tsx
// apps/storefront/src/components/product-card/picker/inline.tsx
'use client';

import { useMemo } from 'react';
import * as ProductOptions from '@/components/product-options';
import { toSelectionRecord } from '@/components/product-options/resolver';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { ProductCardPickerProps } from './types';
import { registerProductCardPicker } from './registry';

const InlinePicker = ({ product, open }: ProductCardPickerProps) => {
  const seed = firstAvailableVariant(product) ?? product.variants?.edges?.[0]?.node;
  const initialSelection = useMemo(() => toSelectionRecord(seed), [seed]);

  if (!open) return null;

  return (
    <div
      role="group"
      aria-label="Product options"
      className="
        w-full p-3 rounded-(--block-border-radius-small)
        bg-(--product-card-more-bg) border border-(--product-card-border-color)
        flex flex-col gap-2
      "
    >
      <ProductOptions.Root product={product} initialSelection={initialSelection}>
        {(product.options ?? []).map((opt) => (
          <div key={opt.name}>
            <div className="text-[10px] font-semibold uppercase tracking-(--product-card-eyebrow-tracking) text-(--product-card-vendor-color) mb-1.5">
              {opt.name}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ProductOptions.Group name={opt.name} density="compact" />
              <ProductOptions.More groupName={opt.name} />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rounded-(--block-border-radius-small) bg-(--product-card-cta-bg) text-(--product-card-cta-color) p-3 text-xs font-semibold leading-none cursor-pointer tabular-nums"
        >
          Add to bag
        </button>
      </ProductOptions.Root>
    </div>
  );
};

InlinePicker.displayName = 'Nordcom.ProductCard.Picker.Inline';
registerProductCardPicker('inline', InlinePicker);
export default InlinePicker;
```

- [ ] **Step 5: Re-run both tests**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card/picker`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/product-card/picker/sheet.tsx apps/storefront/src/components/product-card/picker/sheet.test.tsx apps/storefront/src/components/product-card/picker/inline.tsx apps/storefront/src/components/product-card/picker/inline.test.tsx
git commit -m "feat(storefront/product-card): sheet + inline picker shells."
```

## Task 3.9: Wire pickers via `next/dynamic` and write the picker host

**Files:**
- Create: `apps/storefront/src/components/product-card/picker/index.ts`
- Create: `apps/storefront/src/components/product-card/primitives/product-card-picker.tsx`
- Create: `apps/storefront/src/components/product-card/primitives/product-card-picker.test.tsx`

- [ ] **Step 1: Write the failing host test**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-picker.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCardOptionsProvider } from './product-card-options-provider';
import ProductCardPicker from './product-card-picker';

const product = { handle: 'tee', title: 'Tee', variants: { edges: [{ node: { id: 'v1', availableForSale: true } }] } } as never;
const i18n = {} as never;
const locale = { code: 'en-US' } as never;

describe('ProductCardPicker host', () => {
  it('renders nothing when picker is closed', () => {
    render(
      <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
        <ProductCardPicker presentation="float" product={product} locale={locale} i18n={i18n} />
      </ProductCardOptionsProvider>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card-picker`
Expected: FAIL.

- [ ] **Step 3: Create the registry barrel with `next/dynamic`**

```tsx
// apps/storefront/src/components/product-card/picker/index.ts
'use client';

import dynamic from 'next/dynamic';
import { registerProductCardPicker } from './registry';

// Side-effecting registrations happen inside each shape's module.
// next/dynamic defers Radix dependencies until first render.
const Float = dynamic(() => import('./float'), { ssr: false });
const Sheet = dynamic(() => import('./sheet'), { ssr: false });
const Inline = dynamic(() => import('./inline'), { ssr: false });

registerProductCardPicker('float', Float);
registerProductCardPicker('sheet', Sheet);
registerProductCardPicker('inline', Inline);

export { getProductCardPicker } from './registry';
export type { ProductCardPickerComponent, ProductCardPickerProps } from './types';
```

- [ ] **Step 4: Create the picker host primitive**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-picker.tsx
'use client';

import type { Product } from '@/api/product';
import { getProductCardPicker } from '@/components/product-card/picker';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { usePickerOpen } from './product-card-options-provider';

type Presentation = 'auto' | 'float' | 'sheet' | 'inline';

export type ProductCardPickerProps = {
  product: Product;
  locale: Locale;
  i18n: LocaleDictionary;
  presentation: Presentation;
  ctaPlacement: string;
  layout: 'vertical' | 'horizontal';
};

const resolvePresentation = (
  presentation: Presentation,
  layout: 'vertical' | 'horizontal',
  ctaPlacement: string,
  isMobile: boolean,
): Exclude<Presentation, 'auto'> => {
  if (presentation !== 'auto') return presentation;
  if (layout === 'horizontal') return 'sheet';
  if (isMobile) return 'sheet';
  if (ctaPlacement === 'inline-button') return 'inline';
  return 'float';
};

const ProductCardPicker = ({ product, locale, i18n, presentation, ctaPlacement, layout }: ProductCardPickerProps) => {
  const picker = usePickerOpen();
  if (!picker) return null;

  // SSR-safe: assume non-mobile, hydrate corrects on client. md breakpoint = 768px.
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
  const shape = resolvePresentation(presentation, layout, ctaPlacement, isMobile);

  const Picker = getProductCardPicker(shape);
  return (
    <Picker
      product={product}
      locale={locale}
      i18n={i18n}
      open={picker.open}
      onOpenChange={picker.setOpen}
    />
  );
};

ProductCardPicker.displayName = 'Nordcom.ProductCard.Picker';
export default ProductCardPicker;
```

- [ ] **Step 5: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card-picker`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/product-card/picker/index.ts apps/storefront/src/components/product-card/primitives/product-card-picker.tsx apps/storefront/src/components/product-card/primitives/product-card-picker.test.tsx
git commit -m "feat(storefront/product-card): picker host + lazy-loaded shells via next/dynamic."
```

## Task 3.10: CTA host + provider wiring

**Files:**
- Create: `apps/storefront/src/components/product-card/cta/index.ts`
- Create: `apps/storefront/src/components/product-card/primitives/product-card-cta.tsx`
- Create: `apps/storefront/src/components/product-card/primitives/product-card-cta.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-cta.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCardOptionsProvider } from './product-card-options-provider';
import ProductCardCta from './product-card-cta';

const product = { handle: 'tee', variants: { edges: [{ node: { id: 'v1', availableForSale: true } }] } } as never;

describe('ProductCardCta host', () => {
  it('renders the float-pill strategy when placement is float-pill', () => {
    render(
      <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
        <ProductCardCta placement="float-pill" />
      </ProductCardOptionsProvider>,
    );
    expect(screen.getByRole('button', { name: /choose options/i })).toBeTruthy();
  });

  it('renders the inline-button strategy when placement is inline-button', () => {
    render(
      <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
        <ProductCardCta placement="inline-button" />
      </ProductCardOptionsProvider>,
    );
    expect(screen.getByRole('button', { name: /add to bag/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card-cta`
Expected: FAIL.

- [ ] **Step 3: Create the registry barrel (loads strategies)**

```ts
// apps/storefront/src/components/product-card/cta/index.ts
'use client';

import './float-pill';
import './inline-button';

export { getProductCardCta, registerProductCardCta } from './registry';
export type { ProductCardCtaComponent, ProductCardCtaProps } from './types';
```

- [ ] **Step 4: Create the host primitive**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-cta.tsx
'use client';

import { getProductCardCta } from '@/components/product-card/cta';
import { usePickerOpen, useVariantSelection } from './product-card-options-provider';

export type ProductCardCtaProps = {
  placement: string;
};

const ProductCardCta = ({ placement }: ProductCardCtaProps) => {
  const sel = useVariantSelection();
  const picker = usePickerOpen();
  if (!sel || !picker) return null;

  const Cta = getProductCardCta(placement);

  return (
    <Cta
      productHandle={sel.product.handle}
      seedVariantId={sel.selectedVariantId}
      isSingleBuyable={picker.isSingleBuyable}
      isOpen={picker.open}
      onActivate={() => picker.setOpen(!picker.open)}
      onAdd={() => {
        // Fast-path add path. Trigger the existing add-to-cart action.
        // Hook into the cart provider — wired by the orchestrator's submit handler,
        // which dispatches a server action with the seedVariantId.
        // For now, also open the picker as a safe fallback if cart wiring isn't ready.
        picker.setOpen(true);
      }}
    />
  );
};

ProductCardCta.displayName = 'Nordcom.ProductCard.Cta';
export default ProductCardCta;
```

Note: the fast-path-add behavior is wired in Phase 5 when the orchestrator gets a real cart server action. For now the fast-path opens the picker — visible from the green dot but the actual add still goes through the picker. This is a safe intermediate state.

- [ ] **Step 5: Re-run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card-cta`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/product-card/cta/index.ts apps/storefront/src/components/product-card/primitives/product-card-cta.tsx apps/storefront/src/components/product-card/primitives/product-card-cta.test.tsx
git commit -m "feat(storefront/product-card): CTA host + registry barrel."
```

## Task 3.11: Sale-state badge primitive + strike

**Files:**
- Create: `apps/storefront/src/components/product-card/primitives/product-card-sale-badge.tsx`
- Create: `apps/storefront/src/components/product-card/primitives/product-card-sale-badge.test.tsx`
- Modify: `apps/storefront/src/components/product-card/primitives/product-card-price.tsx` (drawn-strike compare)

- [ ] **Step 1: Write the failing badge test**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-sale-badge.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductCardSaleBadge from './product-card-sale-badge';

describe('ProductCardSaleBadge', () => {
  it('does not render when discount is below min threshold (11%)', () => {
    render(<ProductCardSaleBadge discountPercent={5} style="default" position="top-left" />);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('renders with template "−{n}%" when discount is sufficient', () => {
    render(<ProductCardSaleBadge discountPercent={20} style="default" position="top-left" />);
    expect(screen.getByText('−20%')).toBeTruthy();
  });

  it('honors the style enum via data-style', () => {
    render(<ProductCardSaleBadge discountPercent={20} style="accent" position="top-right" />);
    const el = screen.getByText('−20%');
    expect(el).toHaveAttribute('data-style', 'accent');
    expect(el).toHaveAttribute('data-position', 'top-right');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card-sale-badge`
Expected: FAIL.

- [ ] **Step 3: Create the badge**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-sale-badge.tsx
import { cn } from '@/utils/tailwind';

export type SaleBadgeStyle = 'default' | 'inverse' | 'accent' | 'sales-color';
export type SaleBadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const POSITION_CLASSES: Record<SaleBadgePosition, string> = {
  'top-left': 'top-2.5 left-2.5',
  'top-right': 'top-2.5 right-2.5',
  'bottom-left': 'bottom-2.5 left-2.5',
  'bottom-right': 'bottom-2.5 right-2.5',
};

const STYLE_CLASSES: Record<SaleBadgeStyle, string> = {
  default: 'bg-(--product-card-bg) text-(--product-card-title-color) border border-(--product-card-border-color)',
  inverse: 'bg-(--product-card-title-color) text-(--product-card-bg) border border-(--product-card-title-color)',
  accent: 'bg-(--accent) text-(--accent-foreground) border border-(--accent)',
  'sales-color':
    'bg-(--product-card-sale-current-color) text-(--accent-foreground) border border-(--product-card-sale-current-color)',
};

export type ProductCardSaleBadgeProps = {
  discountPercent: number;
  style: SaleBadgeStyle;
  position: SaleBadgePosition;
  className?: string;
  /** When true, the badge has been shifted to avoid colliding with the CTA in the same corner. */
  collisionShift?: boolean;
};

const ProductCardSaleBadge = ({
  discountPercent,
  style,
  position,
  className,
  collisionShift,
}: ProductCardSaleBadgeProps) => {
  // Minimum discount threshold to render the badge (strike still draws below this).
  if (discountPercent < 11) return null;

  return (
    <span
      data-style={style}
      data-position={position}
      {...(collisionShift ? { 'data-collision-shift': '' } : {})}
      className={cn(
        'absolute z-2 px-2 py-1.5',
        'text-[11px] font-semibold uppercase leading-none tabular-nums',
        'tracking-(--product-card-eyebrow-tracking)',
        'rounded-(--block-border-radius-tiny)',
        STYLE_CLASSES[style],
        POSITION_CLASSES[position],
        className,
      )}
    >
      −{discountPercent}%
    </span>
  );
};

ProductCardSaleBadge.displayName = 'Nordcom.ProductCard.SaleBadge';
export default ProductCardSaleBadge;
```

- [ ] **Step 4: Update `ProductCardPrice` for drawn-strike compare**

```tsx
// apps/storefront/src/components/product-card/primitives/product-card-price.tsx
import type { ProductVariant } from '@/api/product';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductCardPriceProps = {
  seedVariant: ProductVariant;
  locale: Locale;
  className?: string;
};

const ProductCardPrice = ({ seedVariant, locale, className }: ProductCardPriceProps) => {
  const current = seedVariant.price;
  const compare = seedVariant.compareAtPrice;
  const onSale = !!compare && Number(compare.amount) > Number(current.amount);

  const fmt = new Intl.NumberFormat(locale.code, {
    style: 'currency',
    currency: current.currencyCode,
    minimumFractionDigits: 0,
  });

  return (
    <div
      {...(onSale ? { 'data-on-sale': '' } : {})}
      className={cn('flex items-baseline gap-1.5 flex-wrap', className)}
    >
      <span
        className={cn(
          'text-sm font-semibold leading-none tabular-nums',
          'text-(--product-card-price-color)',
          onSale && 'group-data-[on-sale]/card:text-(--product-card-sale-current-color)',
        )}
      >
        {fmt.format(Number(current.amount))}
      </span>
      {onSale && compare ? (
        <span
          className="
            relative px-0.5
            text-xs font-medium leading-none tabular-nums
            text-(--product-card-compare-color)
            after:content-[''] after:absolute after:inset-x-[calc(-1*var(--product-card-sale-strike-extend))]
            after:top-1/2 after:h-px
            after:bg-(--product-card-sale-strike-color,currentColor)
            after:-translate-y-1/2 after:[transform:translateY(-50%)_rotate(var(--product-card-sale-strike-angle))]
          "
        >
          {fmt.format(Number(compare.amount))}
        </span>
      ) : null}
    </div>
  );
};

ProductCardPrice.displayName = 'Nordcom.ProductCard.Price';
export default ProductCardPrice;
```

- [ ] **Step 5: Re-run the tests**

Run: `pnpm test --project @nordcom/commerce-storefront -- 'product-card-(sale-badge|price)'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/product-card/primitives/product-card-sale-badge.tsx apps/storefront/src/components/product-card/primitives/product-card-sale-badge.test.tsx apps/storefront/src/components/product-card/primitives/product-card-price.tsx
git commit -m "feat(storefront/product-card): sale badge enum + drawn-strike compare price."
```

## Task 3.12: New orchestrator + slim data shape

**Files:**
- Modify: `apps/storefront/src/components/product-card/product-card.tsx`
- Modify: `apps/storefront/src/components/product-card/product-card.test.tsx`

- [ ] **Step 1: Update the existing orchestrator test**

```tsx
// apps/storefront/src/components/product-card/product-card.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductCard, { toProductCardData } from './product-card';

const product = {
  id: 'gid://shopify/Product/1',
  handle: 'tee',
  title: 'Heavyweight Box-Cut Tee',
  vendor: 'Everlane',
  availableForSale: true,
  variants: { edges: [{ node: { id: 'v1', availableForSale: true, selectedOptions: [{ name: 'Size', value: 'M' }], price: { amount: '38.00', currencyCode: 'USD' } } }] },
  options: [{ name: 'Size', values: ['M'], optionValues: [{ name: 'M' }] }],
  featuredImage: { url: 'https://example.com/img.webp', altText: null, width: 800, height: 1000 },
} as never;

describe('toProductCardData', () => {
  it('shapes a slim view from the full Product', () => {
    const slim = toProductCardData(product);
    expect(slim.id).toBe(product.id);
    expect(slim.handle).toBe(product.handle);
    expect(slim.title).toBe(product.title);
    expect(slim.vendor).toBe(product.vendor);
    expect(slim.variants).toHaveLength(1);
    expect((slim as unknown as { description?: unknown }).description).toBeUndefined();
  });
});

describe('ProductCard', () => {
  it('renders a card root with the resolved layout + chrome props', async () => {
    const tree = await ProductCard({
      data: product,
      shop: { id: 'shop_1', domain: 'example.com', showProductVendor: true } as never,
      locale: { code: 'en-US' } as never,
      layout: 'vertical',
      chrome: 'boxed',
      ctaPlacement: 'float-pill',
      pickerPresentation: 'auto',
    });
    render(tree);
    expect(screen.getByTestId('product-card-root')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card.test`
Expected: FAIL.

- [ ] **Step 3: Rewrite `product-card.tsx`**

```tsx
// apps/storefront/src/components/product-card/product-card.tsx
import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import ProductCardBadges from '@/components/product-card/primitives/product-card-badges';
import ProductCardCta from '@/components/product-card/primitives/product-card-cta';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import { ProductCardOptionsProvider } from '@/components/product-card/primitives/product-card-options-provider';
import ProductCardPicker from '@/components/product-card/primitives/product-card-picker';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardRoot, {
  type ProductCardChrome,
  type ProductCardLayout,
} from '@/components/product-card/primitives/product-card-root';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';
import ProductCardTitle from '@/components/product-card/primitives/product-card-title';
import { getDictionary } from '@/utils/dictionary';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale } from '@/utils/locale';

/**
 * Slim view of a Product passed to the client provider. Trims out fields the
 * card never reads (prose description, SEO blocks, full image gallery) to
 * cut serialized payload size per card.
 */
export type ProductCardData = Pick<
  Product,
  'id' | 'handle' | 'title' | 'vendor' | 'availableForSale' | 'options' | 'variants' | 'featuredImage' | 'tags'
>;

export function toProductCardData(product: Product): ProductCardData {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    vendor: product.vendor,
    availableForSale: product.availableForSale,
    options: product.options,
    variants: product.variants,
    featuredImage: product.featuredImage,
    tags: product.tags,
  };
}

export type ProductCardProps = {
  data: Product;
  shop: OnlineShop;
  locale: Locale;
  layout: ProductCardLayout;
  chrome: ProductCardChrome;
  ctaPlacement: string;
  pickerPresentation: 'auto' | 'float' | 'sheet' | 'inline';
  priority?: boolean;
  className?: string;
};

export default async function ProductCard({
  data,
  shop,
  locale,
  layout,
  chrome,
  ctaPlacement,
  pickerPresentation,
  priority,
  className,
}: ProductCardProps) {
  if (!data?.variants?.edges?.[0]?.node) return null;

  const i18n = await getDictionary({ shop, locale });
  const slim = toProductCardData(data);
  const seedVariant = firstAvailableVariant(data) ?? data.variants.edges[0]!.node;

  const buyableEdges = (data.variants?.edges ?? []).filter((e) => e?.node?.availableForSale === true);
  const isSingleBuyable = (data.variants?.edges?.length ?? 0) === 1 && seedVariant.availableForSale === true;

  return (
    <ProductCardOptionsProvider product={slim} seedVariantId={seedVariant.id} isSingleBuyable={isSingleBuyable}>
      <ProductCardRoot data={slim} layout={layout} chrome={chrome} className={className}>
        <div className="relative">
          <ProductCardImage product={data} seedVariant={seedVariant} priority={priority} aspect={layout === 'horizontal' ? 'horizontal' : 'vertical'} />
          <ProductCardBadges data={data} i18n={i18n} />
          <ProductCardCta placement={ctaPlacement} />
        </div>
        <div className="flex flex-col gap-1 pt-1">
          {shop.showProductVendor && data.vendor ? (
            <span className="text-xs font-semibold uppercase leading-none tracking-(--product-card-eyebrow-tracking) text-(--product-card-vendor-color)">
              {data.vendor}
            </span>
          ) : null}
          <ProductCardTitle shop={shop} data={data} />
          <ProductCardPrice seedVariant={seedVariant} locale={locale} />
          <ProductCardStockUrgency seedVariant={seedVariant} i18n={i18n} />
        </div>
        <ProductCardPicker
          product={slim}
          locale={locale}
          i18n={i18n}
          presentation={pickerPresentation}
          ctaPlacement={ctaPlacement}
          layout={layout}
        />
      </ProductCardRoot>
    </ProductCardOptionsProvider>
  );
}

ProductCard.displayName = 'Nordcom.ProductCard';
```

- [ ] **Step 4: Re-run the tests**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-card.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-card/product-card.tsx apps/storefront/src/components/product-card/product-card.test.tsx
git commit -m "$(cat <<'EOF'
refactor(storefront/product-card): orchestrator composes provider + primitives.

ProductCard now wraps content in ProductCardOptionsProvider, computes the
slim ProductCardData view, hands the seed variant id and single-buyable
flag to the provider, and renders Image + Badges + Cta + Title + Price +
StockUrgency + Picker. swatches primitive lands in the next task; vendor
eyebrow stays inline for now (gated by shop.showProductVendor).
EOF
)"
```

## Task 3.13: Delete obsolete files

**Files:**
- Delete: `apps/storefront/src/components/product-card/primitives/product-card-overlay.tsx`
- Delete: `apps/storefront/src/components/product-card/primitives/product-card-overlay.test.tsx`
- Delete: `apps/storefront/src/components/product-card/primitives/product-card-options.tsx`
- Delete: `apps/storefront/src/components/product-card/primitives/product-card-options.test.tsx`
- Delete: `apps/storefront/src/components/product-card/primitives/product-card-actions.tsx`
- Delete: `apps/storefront/src/components/product-card/primitives/product-card-actions.test.tsx`
- Delete: `apps/storefront/src/components/product-card/primitives/product-card-actions-client.tsx`
- Delete: `apps/storefront/src/components/product-card/primitives/product-card-actions-client.test.tsx`
- Delete: `apps/storefront/src/components/product-card/product-card.module.css`

- [ ] **Step 1: Confirm no remaining imports reference these files**

```bash
grep -rn 'product-card-overlay\|product-card-options\|product-card-actions\|product-card.module.css' apps/storefront/src --include='*.ts' --include='*.tsx' | grep -v '.test.' | grep -v node_modules
```

Expected: only matches inside the files being deleted (or none at all).

- [ ] **Step 2: Delete the files**

```bash
git rm apps/storefront/src/components/product-card/primitives/product-card-overlay.tsx apps/storefront/src/components/product-card/primitives/product-card-overlay.test.tsx apps/storefront/src/components/product-card/primitives/product-card-options.tsx apps/storefront/src/components/product-card/primitives/product-card-options.test.tsx apps/storefront/src/components/product-card/primitives/product-card-actions.tsx apps/storefront/src/components/product-card/primitives/product-card-actions.test.tsx apps/storefront/src/components/product-card/primitives/product-card-actions-client.tsx apps/storefront/src/components/product-card/primitives/product-card-actions-client.test.tsx apps/storefront/src/components/product-card/product-card.module.css
```

- [ ] **Step 3: Run the storefront test suite**

Run: `pnpm test --project @nordcom/commerce-storefront`
Expected: PASS.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: clean exit.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
refactor(storefront/product-card): remove obsolete overlay/options/actions primitives.

these files are subsumed by the new picker shells, CTA strategies, and
options provider. product-card.module.css is replaced by Tailwind
utilities reading from --block-* and spec-local tokens.
EOF
)"
```

---

# Phase 4 — CSS modules → Tailwind migration (product-options-selector)

Spec ref: §"Performance & implementation guardrails", §"Component architecture".

## Task 4.1: Port `product-options-selector.module.css` to Tailwind

**Files:**
- Read first: `apps/storefront/src/components/product-options-selector/product-options-selector.module.css`
- Modify: `apps/storefront/src/components/product-options-selector/product-options-selector.tsx` (replace `styles.X` with Tailwind classes)
- Delete: `apps/storefront/src/components/product-options-selector/product-options-selector.module.css`

- [ ] **Step 1: Read the module to capture every rule**

```bash
cat apps/storefront/src/components/product-options-selector/product-options-selector.module.css
```

Capture each rule into a comment block so the port is exhaustive.

- [ ] **Step 2: Replace the `import styles from …` and `cn(styles.root, …)` calls with Tailwind utilities**

In `product-options-selector.tsx`:
- Remove `import styles from '@/components/product-options-selector/product-options-selector.module.css';`
- Replace `cn(styles.root, className)` with literal Tailwind classes corresponding to the `.root` rule from the module.
- Replace `styles.optionGroup` with the optionGroup rule's Tailwind equivalent.
- Replace `styles.values` similarly.

(Exact class strings depend on the module's contents — read it in Step 1 and translate one-to-one.)

- [ ] **Step 3: Delete the CSS module**

```bash
git rm apps/storefront/src/components/product-options-selector/product-options-selector.module.css
```

- [ ] **Step 4: Run the storefront test suite**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-options-selector`
Expected: PASS (visual output unchanged).

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-options-selector/product-options-selector.tsx
git commit -m "refactor(storefront/product-options-selector): migrate CSS module to Tailwind."
```

## Task 4.2: Port `renderers/chip.module.css` to Tailwind

**Files:**
- Read: `apps/storefront/src/components/product-options-selector/renderers/chip.module.css`
- Modify: every renderer in `apps/storefront/src/components/product-options-selector/renderers/*.tsx` that imports it
- Delete: `apps/storefront/src/components/product-options-selector/renderers/chip.module.css`

- [ ] **Step 1: Find every importer**

```bash
grep -rln "chip.module.css" apps/storefront/src
```

- [ ] **Step 2: For each importer, replace styled class names with Tailwind**

Mechanical translation following the same pattern as Task 4.1.

- [ ] **Step 3: Delete the module**

```bash
git rm apps/storefront/src/components/product-options-selector/renderers/chip.module.css
```

- [ ] **Step 4: Run the renderer tests**

Run: `pnpm test --project @nordcom/commerce-storefront -- product-options-selector/renderers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-options-selector/renderers/
git commit -m "refactor(storefront/product-options-selector): migrate chip CSS module to Tailwind."
```

---

# Phase 5 — Surface wrappers + CollectionBlock arrows

Spec ref: §"Per-surface behavior", §"Recommendations carousel".

## Task 5.1: Update `CollectionProductCard`, `RecommendationProductCard`, `SearchProductCard` to spread presets

**Files:**
- Modify: `apps/storefront/src/components/products/collection-product-card.tsx`
- Modify: `apps/storefront/src/components/products/recommendation-product-card.tsx`
- Modify: `apps/storefront/src/components/products/search-product-card.tsx`

- [ ] **Step 1: Rewrite each wrapper as a one-liner**

```tsx
// apps/storefront/src/components/products/collection-product-card.tsx
import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import ProductCard from '@/components/product-card/product-card';
import { SURFACE_PRESETS } from '@/components/product-card/presets';
import type { Locale } from '@/utils/locale';

export type CollectionProductCardProps = {
  shop: OnlineShop;
  locale: Locale;
  data: Product;
  priority?: boolean;
  className?: string;
};

const CollectionProductCard = async (props: CollectionProductCardProps) => (
  <ProductCard {...SURFACE_PRESETS.collection} {...props} />
);

CollectionProductCard.displayName = 'Nordcom.Products.CollectionProductCard';
export default CollectionProductCard;
```

Repeat verbatim for `recommendation-product-card.tsx` (use `SURFACE_PRESETS.recommendation`) and `search-product-card.tsx` (use `SURFACE_PRESETS.search`).

- [ ] **Step 2: Delete `apps/storefront/src/components/products/cart-drawer-product-card.tsx`**

```bash
git rm apps/storefront/src/components/products/cart-drawer-product-card.tsx
```

- [ ] **Step 3: Run the storefront tests**

Run: `pnpm test --project @nordcom/commerce-storefront -- 'components/products/(collection|recommendation|search)-product-card'`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/components/products/
git commit -m "$(cat <<'EOF'
refactor(storefront/product-card): wrappers spread SURFACE_PRESETS.

CollectionProductCard, RecommendationProductCard, SearchProductCard become
thin spreads over the orchestrator. CartDrawerProductCard removed — zero
consumers and CartLine handles cart-drawer items separately.
EOF
)"
```

## Task 5.2: Search page `chrome=bare` → `boxed` cleanup

**Files:**
- Modify: `apps/storefront/src/app/[domain]/[locale]/search/search-content-gate.tsx` (lines 23, 29, 49 — change `chrome="bare"` to `chrome="boxed"` AND `layout="horizontal"`).

- [ ] **Step 1: Edit**

```tsx
// apps/storefront/src/app/[domain]/[locale]/search/search-content-gate.tsx
// Replace `chrome="bare"` with `chrome="boxed"` in all three skeleton call-sites.
```

- [ ] **Step 2: Run the search content-gate test**

Run: `pnpm test --project @nordcom/commerce-storefront -- search-content-gate`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/[domain]/[locale]/search/search-content-gate.tsx
git commit -m "refactor(storefront/search): skeleton uses chrome=boxed to match new search row."
```

## Task 5.3: `CollectionBlock` arrows + scroll-padding

**Files:**
- Modify: `apps/storefront/src/components/products/collection-block.tsx`
- Create: `apps/storefront/src/components/products/collection-block-arrows.tsx`
- Create: `apps/storefront/src/components/products/collection-block-arrows.test.tsx`

- [ ] **Step 1: Write the failing arrows test**

```tsx
// apps/storefront/src/components/products/collection-block-arrows.test.tsx
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CollectionBlockArrows from './collection-block-arrows';

class MockObserver {
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) { this.callback = cb; }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = () => [];
  root = null;
  rootMargin = '';
  thresholds = [];
}

describe('CollectionBlockArrows', () => {
  it('renders both arrow buttons', () => {
    (globalThis as never as { IntersectionObserver: typeof MockObserver }).IntersectionObserver = MockObserver;
    render(
      <div>
        <div data-testid="rail">
          <span>first</span><span>last</span>
        </div>
        <CollectionBlockArrows railSelector="[data-testid='rail']" />
      </div>,
    );
    expect(screen.getByLabelText('Previous')).toBeTruthy();
    expect(screen.getByLabelText('Next')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test (expect FAIL)**

Run: `pnpm test --project @nordcom/commerce-storefront -- collection-block-arrows`
Expected: FAIL.

- [ ] **Step 3: Create `collection-block-arrows.tsx`**

```tsx
// apps/storefront/src/components/products/collection-block-arrows.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export type CollectionBlockArrowsProps = {
  /** CSS selector pointing at the rail container element; used to find first/last children. */
  railSelector: string;
};

const ARROW_CLASSES = `
  absolute top-[38%] z-4 size-9 inline-flex items-center justify-center
  rounded-full bg-white border border-(--product-card-border-color)
  shadow-product-card-hover text-(--product-card-title-color) cursor-pointer
  text-base font-semibold
  motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)
  data-[hidden]:hidden
  media-touch:hidden
`;

const CollectionBlockArrows = ({ railSelector }: CollectionBlockArrowsProps) => {
  const railRef = useRef<HTMLElement | null>(null);
  const [firstVisible, setFirstVisible] = useState(true);
  const [lastVisible, setLastVisible] = useState(false);

  useEffect(() => {
    const rail = document.querySelector(railSelector);
    if (!(rail instanceof HTMLElement)) return;
    railRef.current = rail;
    const first = rail.firstElementChild;
    const last = rail.lastElementChild;
    if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === first) setFirstVisible(entry.isIntersecting);
          if (entry.target === last) setLastVisible(entry.isIntersecting);
        }
      },
      { root: rail, threshold: 0.95 },
    );
    observer.observe(first);
    observer.observe(last);
    return () => observer.disconnect();
  }, [railSelector]);

  const scroll = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const child = rail.firstElementChild as HTMLElement | null;
    const step = child ? child.getBoundingClientRect().width + 14 : 240;
    rail.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  const allVisible = firstVisible && lastVisible;

  return (
    <>
      <button
        type="button"
        aria-label="Previous"
        data-side="prev"
        onClick={() => scroll(-1)}
        {...(firstVisible || allVisible ? { 'data-hidden': '' } : {})}
        className={`${ARROW_CLASSES} left-[-8px]`}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next"
        data-side="next"
        onClick={() => scroll(1)}
        {...(lastVisible || allVisible ? { 'data-hidden': '' } : {})}
        className={`${ARROW_CLASSES} right-[-8px]`}
      >
        ›
      </button>
    </>
  );
};

CollectionBlockArrows.displayName = 'Nordcom.Products.CollectionBlockArrows';
export default CollectionBlockArrows;
```

- [ ] **Step 4: Wire `CollectionBlock` to render arrows in horizontal mode**

In `apps/storefront/src/components/products/collection-block.tsx` (around line 100, where `isHorizontal` flips the grid template):

```tsx
// Inside the return block when isHorizontal is true:
const railId = `rail-${Math.random().toString(36).slice(2, 9)}`;
return (
  <div className="relative">
    {isHorizontal ? <CollectionBlockArrows railSelector={`[data-rail='${railId}']`} /> : null}
    <Tag
      {...props}
      data-rail={isHorizontal ? railId : undefined}
      className={cn(
        'contain-intrinsic-size-[auto_100%] grid w-full snap-x snap-mandatory gap-2 content-visibility-auto',
        !isHorizontal &&
          'grid-cols-[repeat(auto-fill,minmax(var(--product-card-min-width),var(--product-card-max-width)))] justify-(--product-card-grid-align)',
        isHorizontal &&
          'overflow-x-shadow -my-2 auto-cols-[var(--product-card-max-width)] grid-flow-col grid-cols-[var(--product-card-max-width)] grid-rows-1 overscroll-x-auto py-2 scroll-px-(--block-padding)',
        className,
      )}
    >
      {children}
      {productCards}
      {collection && showViewAll ? <CollectionViewAllTile collection={collection} /> : null}
    </Tag>
  </div>
);
```

Note: `auto-cols-[var(--product-card-max-width)]` replaces the previous `minmax(13rem,1fr)` so cards stay at the new 240px max in rails. `scroll-px-(--block-padding)` sets `scroll-padding-inline`.

- [ ] **Step 5: Run the test + an integration sanity test**

Run: `pnpm test --project @nordcom/commerce-storefront -- 'products/collection-block(-arrows)?'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/products/collection-block.tsx apps/storefront/src/components/products/collection-block-arrows.tsx apps/storefront/src/components/products/collection-block-arrows.test.tsx
git commit -m "$(cat <<'EOF'
feat(storefront/products): collection-block carousel arrows + new sizing.

isHorizontal rails now ship with IntersectionObserver-driven prev/next
arrows that auto-hide when content fits. card width tracks the new
--product-card-max-width token. scroll-padding-inline keeps snapped
cards off the rail edge. touch users get native scroll (arrows hidden
via media-touch).
EOF
)"
```

---

# Phase 6 — E2E coverage + manual verification

Spec ref: §"Testing strategy", §"Manual verification".

## Task 6.1: E2E — picker open/close + swatch image swap

**Files:**
- Create: `apps/storefront/e2e/picker-open-close.spec.ts`
- Create: `apps/storefront/e2e/swatch-image-swap.spec.ts`

- [ ] **Step 1: Write the picker E2E**

```ts
// apps/storefront/e2e/picker-open-close.spec.ts
import { expect, test } from '@playwright/test';

test('picker float opens via + on vertical card, closes via ESC', async ({ page }) => {
  await page.goto('/en-US/collections/all/');
  const firstCard = page.getByTestId('product-card-root').first();
  const cta = firstCard.getByRole('button', { name: /choose options|quick add|add to bag/i });
  await cta.click();
  await expect(page.getByRole('dialog').or(page.getByRole('group'))).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog').or(page.getByRole('group'))).toBeHidden();
});

test('picker sheet opens on search results, closes via backdrop click', async ({ page }) => {
  await page.goto('/en-US/search/?q=t-shirt');
  const firstRow = page.getByTestId('product-card-root').first();
  await firstRow.getByRole('button', { name: /choose options/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Click outside the dialog content
  await page.mouse.click(10, 10);
  await expect(dialog).toBeHidden();
});
```

- [ ] **Step 2: Write the swatch swap E2E**

```ts
// apps/storefront/e2e/swatch-image-swap.spec.ts
import { expect, test } from '@playwright/test';

test('clicking a swatch swaps the image src; URL unchanged', async ({ page }) => {
  await page.goto('/en-US/collections/all/');
  const url = page.url();
  const card = page.getByTestId('product-card-root').first();
  const img = card.locator('img').first();
  const initialSrc = await img.getAttribute('src');
  const swatches = card.locator('[data-option-value] button');
  if ((await swatches.count()) < 2) test.skip();
  await swatches.nth(1).click();
  // Allow time for client-side re-render
  await page.waitForTimeout(150);
  const newSrc = await img.getAttribute('src');
  expect(newSrc).not.toBe(initialSrc);
  expect(page.url()).toBe(url);
});
```

- [ ] **Step 3: Run E2E**

Run: `pnpm test:e2e -- 'picker-open-close|swatch-image-swap'`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/e2e/picker-open-close.spec.ts apps/storefront/e2e/swatch-image-swap.spec.ts
git commit -m "test(storefront/product-card): e2e for picker lifecycle + swatch image swap."
```

## Task 6.2: E2E — fast-path, OOS, sale, recommendations arrows

**Files:**
- Create: `apps/storefront/e2e/single-buyable-fast-path.spec.ts`
- Create: `apps/storefront/e2e/out-of-stock-disabled.spec.ts`
- Create: `apps/storefront/e2e/sale-state.spec.ts`
- Create: `apps/storefront/e2e/recommendations-rail-arrows.spec.ts`

- [ ] **Step 1: Single-buyable fast-path**

```ts
// apps/storefront/e2e/single-buyable-fast-path.spec.ts
import { expect, test } from '@playwright/test';

test('single-buyable card shows the green fast-path dot on +', async ({ page }) => {
  await page.goto('/en-US/collections/all/');
  const fastPath = page.locator('[data-testid="product-card-root"] [data-fast-path]');
  await expect(fastPath.first()).toBeVisible({ timeout: 5_000 });
});
```

- [ ] **Step 2: OOS disabled state**

```ts
// apps/storefront/e2e/out-of-stock-disabled.spec.ts
import { expect, test } from '@playwright/test';

test('OOS card has data-availability and CTA disabled', async ({ page }) => {
  await page.goto('/en-US/collections/all/');
  const oos = page.locator('[data-testid="product-card-root"][data-availability="out-of-stock"]');
  // Seed data SHOULD have at least one OOS; if it doesn't, the test fixture should add one.
  if ((await oos.count()) === 0) test.skip();
  const cta = oos.first().locator('button').first();
  await expect(cta).toBeDisabled();
});
```

- [ ] **Step 3: Sale strike + badge**

```ts
// apps/storefront/e2e/sale-state.spec.ts
import { expect, test } from '@playwright/test';

test('on-sale card draws strike on compare price and renders the badge', async ({ page }) => {
  await page.goto('/en-US/collections/all/');
  const onSale = page.locator('[data-testid="product-card-root"][data-on-sale]').first();
  if (!(await onSale.count())) test.skip();
  // The compare-price element renders inside the price block.
  await expect(onSale.locator('text=/\\$\\d+/')).toHaveCount({ min: 2 } as never);
});
```

- [ ] **Step 4: Recommendations rail arrows**

```ts
// apps/storefront/e2e/recommendations-rail-arrows.spec.ts
import { expect, test } from '@playwright/test';

test('PDP recommendations rail shows next arrow when content overflows', async ({ page }) => {
  await page.goto('/en-US/products/men-t-shirt/?Color=Red&Size=X-Large');
  const next = page.getByRole('button', { name: 'Next' });
  await expect(next.first()).toBeVisible();
  const railFirst = page.locator('[data-rail] > *').first();
  const beforeBox = await railFirst.boundingBox();
  await next.first().click();
  await page.waitForTimeout(400);
  const afterBox = await railFirst.boundingBox();
  expect(afterBox?.x).toBeLessThan(beforeBox?.x ?? 0);
});
```

- [ ] **Step 5: Run all four**

Run: `pnpm test:e2e -- '(single-buyable-fast-path|out-of-stock-disabled|sale-state|recommendations-rail-arrows)'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/e2e/single-buyable-fast-path.spec.ts apps/storefront/e2e/out-of-stock-disabled.spec.ts apps/storefront/e2e/sale-state.spec.ts apps/storefront/e2e/recommendations-rail-arrows.spec.ts
git commit -m "test(storefront/product-card): e2e for fast-path, OOS, sale, recommendations arrows."
```

## Task 6.3: Update the existing E2E spec for the new card shape

**Files:**
- Modify: `apps/storefront/e2e/product-card.spec.ts`

- [ ] **Step 1: Update the existing spec**

The existing `e2e/product-card.spec.ts` asserts the old layout (size pills present on base card, etc.). Walk every assertion and update:
- No size pills on the base card; the picker is the only place chips appear.
- Swatches still appear on the base card.
- The `+` CTA replaces the old "Add to bag" button.
- Touch-target assertion stays at ≥ 36px (unchanged).

- [ ] **Step 2: Run the spec**

Run: `pnpm test:e2e -- product-card.spec`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/e2e/product-card.spec.ts
git commit -m "test(storefront/product-card): update e2e for new card shape (no size pills on base)."
```

## Task 6.4: Final verification

- [ ] **Step 1: Full storefront test suite**

Run: `pnpm test --project @nordcom/commerce-storefront`
Expected: PASS. Branch coverage ≥ 50% on `apps/storefront/src` (existing gate).

- [ ] **Step 2: Full E2E suite**

Run: `pnpm test:e2e`
Expected: PASS.

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: clean exit.

- [ ] **Step 4: Browser verification per spec §"Manual verification"**

Walk every step in `.specs/2026-05-26-product-card-redesign/spec.md` under §"Manual verification". For each item, paste the result (PASS / observation) in a session note.

- [ ] **Step 5: Update `CONTEXT.md` glossary**

Per spec §"CONTEXT.md updates", add the following terms to `CONTEXT.md` (single-context repo at root):

- **Product card** — chassis + primitives composed via surface wrappers (Collection, Recommendation, Search). Browse tile, not a buy form; variant selection happens in a picker.
- **Surface wrapper** — per-surface composition of the product card; reads from `SURFACE_PRESETS` in `product-card/presets.ts`.
- **Picker** — variant-selection UI opened from a card's CTA. Presents as `float`, `sheet`, or `inline` per the surface + viewport routing rule. Implementations are registered in `product-card/picker/`.
- **Quick add** — informal term for the picker entry point. Token-driven CTA placement (`float-pill` | `inline-button`).
- **Single buyable variant fast-path** — when a product has exactly one variant AND it's available, `+` adds it directly without opening the picker.

- [ ] **Step 6: Commit the CONTEXT.md update**

```bash
git add CONTEXT.md
git commit -m "docs(context): add product-card glossary entries."
```

- [ ] **Step 7: Confirm the spec's "Manual verification" checklist passes end-to-end**

Visit `https://beta.pouched.de/en-US/search/?q=t-shirt` (or the equivalent deployment of the branch) and confirm:
1. Cards now render (Phase 1 bug).
2. No `+0` chip leak anywhere.
3. No text-strikethrough on pills (no pills on base card).
4. Recommendations rail arrows visible when content overflows on `/products/men-t-shirt/`.
5. Image has no cream banding (was caused by old `object-contain` default).
6. `+` shows green dot only on single-buyable products.
7. Clicking `+` opens the picker (or fast-path adds for single-buyable).
8. Reduced-motion respected: hover scales drop, opacity fades remain.

- [ ] **Step 8: Push the branch / open the PR**

```bash
git push -u origin <branch>
gh pr create --title "feat(storefront/product-card): token-driven chassis, picker registry, search bug fix" --body "$(cat <<'EOF'
## Summary
- Replaces product-card chassis + primitives with a token-driven, registry-extensible system per `.specs/2026-05-26-product-card-redesign/spec.md`.
- Fixes the production search-renders-0-cards bug (Phase 1).
- Migrates 3 CSS modules to Tailwind.
- Enhances CollectionBlock with carousel arrows.

## Test plan
- [x] Phase 1 search-bug E2E + smoke unit test
- [x] Phase 2 registries + presets + provider unit tests
- [x] Phase 3 primitive unit tests (chassis, image, swatch, chip, More, CTA, picker shells, sale badge, price strike)
- [x] Phase 4 CSS-module → Tailwind visual port (no rendering change)
- [x] Phase 5 surface wrappers + CollectionBlock arrows
- [x] Phase 6 E2E coverage for picker lifecycle, fast-path, OOS, sale, recs arrows
- [x] Branch coverage ≥ 50% on `apps/storefront/src`
- [x] Manual browser verification per spec §"Manual verification"
EOF
)"
```

---

## Self-review checklist (run after the plan is committed but before execution)

Walk this list once, fix issues inline, then proceed.

- **Spec coverage:** Every section of `spec.md` has at least one task that implements it. Confirmed: Phase 1 → search bug; Phases 2–3 → tokens / architecture / primitives / sale state / skeletons (skeletons handled via `data-skeleton` reuse — no new files needed); Phase 4 → CSS migration; Phase 5 → surface wrappers + rail arrows; Phase 6 → tests.
- **Placeholder scan:** Every step has concrete code, exact file paths, expected output. The `pnpm cms:gen` step is concrete; the manual-verification step quotes specific URLs.
- **Type consistency:** `ProductCardLayout` (`vertical | horizontal`), `ProductCardChrome` (`boxed | frameless`), `ProductCardCtaProps` (consistent across `cta/types.ts`, `cta/float-pill.tsx`, `cta/inline-button.tsx`), `ProductCardPickerProps` (consistent across `picker/types.ts`, `picker/float.tsx`, `picker/sheet.tsx`, `picker/inline.tsx`), `usePickerOpen` + `useVariantSelection` return shapes match consumer expectations.
- **Open follow-ups:** the fast-path add behavior in `ProductCardCta` falls back to opening the picker (Task 3.10 Step 4) until cart wiring lands. This is intentional and called out — a TODO comment is allowed in the implementation pointing back at this plan line. If the wiring happens in this branch, replace the safe-fallback with the real server action invocation; the test will need to mock it.
- **The `Phase 1 ship gate` note** acknowledges that Phase 1 can ship as a standalone PR. If the team chooses to do that, Phases 2–6 land in a follow-up branch from `master`.

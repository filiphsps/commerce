# Per-instance product-card overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a single collection block instance override the product-card presentation (`layout`, `chrome`, `ctaPlacement`, `pickerPresentation`) for the cards it renders, resolved as the highest tier of the store-customization cascade.

**Architecture:** Add a fourth, highest-precedence `instance` tier to `resolveProductCardSurface`, thread a per-instance override from the collection block node (`block.productCard`) through the render path to each card, and author it via a "Card overrides" `group` field of `overridable()` knobs on the collection block — distinct from the block-settings "Overrides" group. The node field flows to the editor + Convex through `cms:gen`.

**Tech Stack:** TypeScript, React Server Components (Next.js), `@nordcom/commerce-cms` descriptors + codegen, Convex validators, Vitest, Playwright. Biome for lint/format.

**Spec:** `.specs/2026-06-16-per-instance-product-card-overrides/spec.md`

---

## File structure

| File | Responsibility | Change |
| --- | --- | --- |
| `apps/storefront/src/components/product-card/presets.ts` | Surface-config resolution | Add `instance` tier param |
| `apps/storefront/src/components/product-card/presets.test.ts` | Resolver tests | Add instance-tier tests |
| `apps/storefront/src/api/extensions.ts` | Per-shop resolution seam | Thread `instance` through `productCardSurfaceForShop` |
| `apps/storefront/src/api/extensions.test.ts` | Seam tests | Create |
| `packages/cms/src/blocks/render/types.ts` | Render node types | Add `productCard?` to `CollectionBlockNode` |
| `apps/storefront/src/components/products/collection-product-card.tsx` | Collection-surface card | Accept + forward `cardOverride` |
| `apps/storefront/src/components/products/collection-block.tsx` | Inner grid component | Accept + forward `cardOverride` to each card |
| `apps/storefront/src/blocks/collection.tsx` | CMS collection block | Read `block.productCard`, pass down |
| `packages/cms/src/blocks/registry.ts` | Block descriptors | Add "Card overrides" group to collection `fields` |
| `packages/cms/src/types/content-types.ts` | Generated node shapes | Regenerated via `cms:gen` |
| `packages/convex/convex/tables/cms.ts` | Generated validators | Regenerated via `cms:gen` |
| `apps/admin/e2e/block-instance-overrides.spec.ts` | E2E coverage | Add per-instance card-override test |

Dependency order: resolver (1) → seam (2) → render type (3) → render threading (4) → descriptor (5) → codegen (6) → e2e (7) → final gates (8).

---

## Task 1: Resolver gains the per-instance `instance` tier

**Files:**
- Modify: `apps/storefront/src/components/product-card/presets.ts:70-84`
- Test: `apps/storefront/src/components/product-card/presets.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/storefront/src/components/product-card/presets.test.ts` (the file already imports `SURFACE_PRESETS`; extend the import line to also import `resolveProductCardSurface`):

```ts
import { resolveProductCardSurface, SURFACE_PRESETS } from './presets';

describe('resolveProductCardSurface — per-instance tier', () => {
    it('instance overrides per-surface, base, and preset per field', () => {
        const resolved = resolveProductCardSurface(
            'collection',
            { layout: 'horizontal' }, // per-surface override
            { chrome: 'frameless' }, // store-wide base
            { ctaPlacement: 'float-pill', layout: 'vertical' }, // per-instance override
        );
        expect(resolved).toEqual({
            layout: 'vertical', // instance wins over the per-surface 'horizontal'
            chrome: 'frameless', // base, untouched by instance
            ctaPlacement: 'float-pill', // instance
            pickerPresentation: SURFACE_PRESETS.collection.pickerPresentation, // preset
        });
    });

    it('a partial instance override falls through field-by-field', () => {
        const resolved = resolveProductCardSurface('collection', undefined, undefined, { chrome: 'frameless' });
        expect(resolved).toEqual({
            layout: SURFACE_PRESETS.collection.layout,
            chrome: 'frameless',
            ctaPlacement: SURFACE_PRESETS.collection.ctaPlacement,
            pickerPresentation: SURFACE_PRESETS.collection.pickerPresentation,
        });
    });

    it('an absent instance override is byte-identical to the three-tier result', () => {
        const withInstance = resolveProductCardSurface('collection', { layout: 'horizontal' }, { chrome: 'frameless' });
        const explicitUndefined = resolveProductCardSurface(
            'collection',
            { layout: 'horizontal' },
            { chrome: 'frameless' },
            undefined,
        );
        expect(explicitUndefined).toEqual(withInstance);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test apps/storefront/src/components/product-card/presets.test.ts`
Expected: FAIL — `resolveProductCardSurface` takes 3 args; the 4th-arg `instance` is ignored, so the first test's `layout`/`ctaPlacement` assertions fail.

- [ ] **Step 3: Add the `instance` tier**

In `apps/storefront/src/components/product-card/presets.ts`, replace the signature + body of `resolveProductCardSurface` (lines 70-84) with:

```ts
export function resolveProductCardSurface(
    surface: string,
    override?: ProductCardSurfaceOverride,
    base?: ProductCardSurfaceOverride,
    instance?: ProductCardSurfaceOverride,
): ProductCardSurfacePreset {
    const preset: ProductCardSurfacePreset =
        (SURFACE_PRESETS as Record<string, ProductCardSurfacePreset>)[surface] ?? BUILTIN_PRODUCT_CARD_SURFACE;

    return {
        layout: instance?.layout ?? override?.layout ?? base?.layout ?? preset.layout,
        chrome: instance?.chrome ?? override?.chrome ?? base?.chrome ?? preset.chrome,
        ctaPlacement: instance?.ctaPlacement ?? override?.ctaPlacement ?? base?.ctaPlacement ?? preset.ctaPlacement,
        pickerPresentation:
            instance?.pickerPresentation ??
            override?.pickerPresentation ??
            base?.pickerPresentation ??
            preset.pickerPresentation,
    };
}
```

Also update the JSDoc above it: change the precedence line to read "Precedence per field (highest first): per-instance `instance` → per-surface store `override` → the store-wide `base` → the `SURFACE_PRESETS` entry → `BUILTIN_PRODUCT_CARD_SURFACE`." and add `@param instance - Optional per-instance fields (highest precedence), authored on the hosting block node.`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test apps/storefront/src/components/product-card/presets.test.ts`
Expected: PASS (all three new tests + the existing `SURFACE_PRESETS` tests).

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/product-card/presets.ts apps/storefront/src/components/product-card/presets.test.ts
git commit -m "feat(storefront): add the per-instance tier to product-card surface resolution."
```

---

## Task 2: Thread `instance` through `productCardSurfaceForShop`

**Files:**
- Modify: `apps/storefront/src/api/extensions.ts:38-43`
- Test: `apps/storefront/src/api/extensions.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/storefront/src/api/extensions.test.ts`:

```ts
import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';

import { productCardSurfaceForShop } from './extensions';

/** Minimal shop carrying only the manifest fields the resolver reads. */
const shopWith = (productCard: Record<string, unknown>): OnlineShop =>
    ({ extensions: { productCard } }) as unknown as OnlineShop;

describe('productCardSurfaceForShop — per-instance override', () => {
    it('layers the instance override above the per-surface selection', () => {
        const shop = shopWith({
            base: { chrome: 'frameless' },
            collection: { layout: 'horizontal' },
        });
        const resolved = productCardSurfaceForShop(shop, 'collection', { layout: 'vertical' });
        expect(resolved.layout).toBe('vertical'); // instance beats the per-surface 'horizontal'
        expect(resolved.chrome).toBe('frameless'); // base still applies
    });

    it('without an instance override resolves identically to the omitted-arg call', () => {
        const shop = shopWith({ collection: { layout: 'horizontal' } });
        expect(productCardSurfaceForShop(shop, 'collection', undefined)).toEqual(
            productCardSurfaceForShop(shop, 'collection'),
        );
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test apps/storefront/src/api/extensions.test.ts`
Expected: FAIL — `productCardSurfaceForShop` accepts only `(shop, surface)`; the third arg is ignored, so `resolved.layout` is `'horizontal'`, not `'vertical'`.

- [ ] **Step 3: Add the `instance` parameter**

In `apps/storefront/src/api/extensions.ts`, replace `productCardSurfaceForShop` (lines 38-43) with:

```ts
export function productCardSurfaceForShop(
    shop: OnlineShop,
    surface: string,
    instance?: ProductCardSurfaceOverride,
): ProductCardSurfacePreset {
    const resolved = ResolvedExtensionsApi({ shop }).productCard;
    const selection = resolved[surface] as ProductCardSurfaceOverride | undefined;
    const base = resolved.base as ProductCardSurfaceOverride | undefined;
    return resolveProductCardSurface(surface, selection, base, instance);
}
```

Update its JSDoc: add `@param instance - Optional per-instance override authored on the hosting block node; highest precedence.`

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test apps/storefront/src/api/extensions.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/api/extensions.ts apps/storefront/src/api/extensions.test.ts
git commit -m "feat(storefront): thread a per-instance card override through productCardSurfaceForShop."
```

---

## Task 3: Add `productCard?` to the render `CollectionBlockNode` type

**Files:**
- Modify: `packages/cms/src/blocks/render/types.ts:211-235`

This is a type-only change that the storefront threading (Task 4) reads via `@nordcom/commerce-cms/blocks/render`.

- [ ] **Step 1: Add the optional field**

In `packages/cms/src/blocks/render/types.ts`, inside `export type CollectionBlockNode = { … }`, after the `colorScheme?` field, add:

```ts
    /**
     * Per-instance override of the product-card presentation for the cards this block renders — the
     * top tier of the {@link https://example.invalid Setting cascade} (instance → per-surface → store
     * base → preset). Authored in the block's "Card overrides" group. Each field is optional; an
     * absent field inherits the resolved `collection`-surface card config. See ADR 0004.
     */
    productCard?: {
        layout?: 'vertical' | 'horizontal';
        chrome?: 'boxed' | 'frameless';
        ctaPlacement?: 'float-pill' | 'inline-button';
        pickerPresentation?: 'auto' | 'float' | 'sheet' | 'inline';
    };
```

(Drop the `@link` if the file's JSDoc lint rejects the placeholder URL — plain prose "the Setting cascade" is fine.)

- [ ] **Step 2: Build the package + typecheck**

Run: `pnpm build:packages && pnpm typecheck --filter @nordcom/commerce-cms`
Expected: PASS (no type errors; the new optional field compiles).

- [ ] **Step 3: Commit**

```bash
git add packages/cms/src/blocks/render/types.ts
git commit -m "feat(cms): add the per-instance productCard override to the collection block node type."
```

---

## Task 4: Thread the override through the render path

**Files:**
- Modify: `apps/storefront/src/components/products/collection-product-card.tsx`
- Modify: `apps/storefront/src/components/products/collection-block.tsx:24-31, 56-118, 159-180`
- Modify: `apps/storefront/src/blocks/collection.tsx:60-104`

These are async server components over Shopify; correctness is verified by typecheck here and the Task 7 e2e (not an isolated unit test).

- [ ] **Step 1: Forward `cardOverride` in the collection-surface card**

Replace `apps/storefront/src/components/products/collection-product-card.tsx` lines 9-31 with:

```ts
export type CollectionProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
    /** Per-instance override from the hosting collection block node. */
    cardOverride?: ProductCardSurfaceOverride;
};

/**
 * Renders a product card for the `collection` surface, resolving its configuration through the
 * store-default cascade (per-instance `cardOverride` → `extensions.productCard.collection` → store
 * base → surface preset). A shop with no override renders byte-identically to the preset.
 *
 * @param props.shop - Shop record; also the store-default source.
 * @param props.locale - Locale forwarded to the product card.
 * @param props.data - Product to display.
 * @param props.priority - When `true`, loads the card image eagerly.
 * @param props.className - Additional CSS class names.
 * @param props.cardOverride - Per-instance override from the hosting collection block.
 * @returns The `ProductCard` element.
 */
const CollectionProductCard = async ({ cardOverride, ...rest }: CollectionProductCardProps) => (
    <ProductCard {...productCardSurfaceForShop(rest.shop, 'collection', cardOverride)} {...rest} />
);
```

Add the import at the top: change line 6 area to also import the override type from the presets module:

```ts
import ProductCard from '@/components/product-card/product-card';
import type { ProductCardSurfaceOverride } from '@/components/product-card/presets';
```

- [ ] **Step 2: Carry `cardOverride` through the inner grid component**

In `apps/storefront/src/components/products/collection-block.tsx`:

(a) Add the import near the top (with the other `@/components/product-card` imports):

```ts
import type { ProductCardSurfaceOverride } from '@/components/product-card/presets';
```

(b) Extend `CardComponent` (lines 24-30) to accept the optional override:

```ts
type CardComponent = ComponentType<{
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
    cardOverride?: ProductCardSurfaceOverride;
}>;
```

(c) Add `cardOverride` to `CollectionBlockBase` (lines 96-117), after `card?: CardComponent;`:

```ts
    cardOverride?: ProductCardSurfaceOverride;
```

(d) Destructure it in the component signature (lines 138-158), adding `cardOverride,` alongside `card,`:

```ts
    bare = false,
    card,
    cardOverride,
    cardSkeleton,
    ...props
```

(e) Pass it to each card in the `productCards` map (lines 176-180):

```ts
    const productCards = products.map((product, index) => (
        <Suspense key={product.id} fallback={<CardSkeleton />}>
            <Card shop={shop} locale={locale} data={product} priority={priority && index < 2} cardOverride={cardOverride} />
        </Suspense>
    ));
```

- [ ] **Step 3: Read `block.productCard` in the CMS collection block**

In `apps/storefront/src/blocks/collection.tsx`, in the `CollectionBlock` component body (the JSX around lines 91-101), add `cardOverride={block.productCard}` to the `<CollectionBlockComponent … />` props:

```tsx
                <CollectionBlockComponent
                    shop={context.shop}
                    locale={context.locale}
                    handle={block.handle}
                    layout={layout}
                    limit={block.limit ?? 16}
                    priority={index < 3}
                    cardOverride={block.productCard}
                    className="w-full"
                />
```

- [ ] **Step 4: Build + typecheck**

Run: `pnpm build:packages && pnpm typecheck --filter @nordcom/commerce-storefront`
Expected: PASS. `block.productCard` is typed (Task 3), and `cardOverride` threads with matching types end to end.

- [ ] **Step 5: Lint the touched files**

Run: `pnpm exec biome check apps/storefront/src/components/products/collection-product-card.tsx apps/storefront/src/components/products/collection-block.tsx apps/storefront/src/blocks/collection.tsx`
Expected: No diagnostics.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/products/collection-product-card.tsx apps/storefront/src/components/products/collection-block.tsx apps/storefront/src/blocks/collection.tsx
git commit -m "feat(storefront): thread the collection block per-instance card override to its cards."
```

---

## Task 5: Author the "Card overrides" group on the collection block descriptor

**Files:**
- Modify: `packages/cms/src/blocks/registry.ts` (collection `collectionFields`, ~131-153; imports, ~1-20)

- [ ] **Step 1: Ensure `groupField` is imported**

In `packages/cms/src/blocks/registry.ts`, confirm the descriptor-builders import block (top of file) includes `groupField`. If absent, add it alphabetically to the existing import from the builders module (the same import that already provides `selectField`, `overridable`, `responsiveField`, `textField`, `numberField`).

- [ ] **Step 2: Add the group to `collectionFields`**

In `collectionFields`, append a `productCard` group after the `colorScheme` select (so it renders last in the block row):

```ts
    groupField({
        name: 'productCard',
        label: 'Card overrides',
        fields: [
            overridable(
                selectField({
                    name: 'layout',
                    label: 'Card layout',
                    options: [
                        { label: 'Vertical', value: 'vertical' },
                        { label: 'Horizontal', value: 'horizontal' },
                    ],
                }),
                { inheritedSourceLabel: 'Collection default' },
            ),
            overridable(
                selectField({
                    name: 'chrome',
                    label: 'Chrome',
                    options: [
                        { label: 'Boxed', value: 'boxed' },
                        { label: 'Frameless', value: 'frameless' },
                    ],
                }),
                { inheritedSourceLabel: 'Collection default' },
            ),
            overridable(
                selectField({
                    name: 'ctaPlacement',
                    label: 'CTA placement',
                    options: [
                        { label: 'Float pill', value: 'float-pill' },
                        { label: 'Inline button', value: 'inline-button' },
                    ],
                }),
                { inheritedSourceLabel: 'Collection default' },
            ),
            overridable(
                selectField({
                    name: 'pickerPresentation',
                    label: 'Variant picker',
                    options: [
                        { label: 'Auto', value: 'auto' },
                        { label: 'Float', value: 'float' },
                        { label: 'Sheet', value: 'sheet' },
                        { label: 'Inline', value: 'inline' },
                    ],
                }),
                { inheritedSourceLabel: 'Collection default' },
            ),
        ],
    }),
```

> Card `layout` (vertical/horizontal) is intentionally distinct from the block's own content `layout` (grid/carousel) above it. The label "Card layout" disambiguates in the editor.

- [ ] **Step 3: Build the package + typecheck**

Run: `pnpm build:packages && pnpm typecheck --filter @nordcom/commerce-cms`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/cms/src/blocks/registry.ts
git commit -m "feat(cms): add a Card overrides group to the collection block descriptor."
```

---

## Task 6: Regenerate codegen and verify the node shape

**Files:**
- Regenerated: `packages/cms/src/types/content-types.ts`, `packages/convex/convex/tables/cms.ts`
- Possibly modify: the codegen emitter under `packages/cms/scripts/codegen/` (only if overridable-in-group does not emit correctly)

- [ ] **Step 1: Run codegen**

Run: `pnpm cms:gen`
Expected: writes updated `content-types.ts` and `tables/cms.ts`.

- [ ] **Step 2: Verify the generated `CollectionBlockNode` shape**

Run: `pnpm exec rg -n "productCard" packages/cms/src/types/content-types.ts packages/convex/convex/tables/cms.ts`
Expected: `content-types.ts` shows a `productCard?: { layout?: ('vertical' | 'horizontal') | null; chrome?: …; ctaPlacement?: …; pickerPresentation?: … }` on the collection node; `tables/cms.ts` shows a matching `v.optional(v.object({ layout: v.optional(...), … }))`.

If the override fields are MISSING or emitted as a flat/incorrect shape, the codegen emitter does not recurse through `overridable()` children inside a `group`. Fix the emitter in `packages/cms/scripts/codegen/` so a `group` containing `overridable` fields emits an optional object of optional union members (mirror how top-level `overridable` settings already emit `… | null`). Re-run `pnpm cms:gen` and re-verify. Do NOT drop the `overridable()` wrappers to work around this.

- [ ] **Step 3: Run the codegen gate**

Run: `pnpm cms:gen:check`
Expected: PASS (generated files match the descriptors — i.e. Step 1 left nothing un-regenerated).

- [ ] **Step 4: Build + typecheck the affected packages**

Run: `pnpm build:packages && pnpm typecheck --filter @nordcom/commerce-cms --filter @nordcom/commerce-convex`
Expected: PASS.

- [ ] **Step 5: Convex limit-boundary gate (touched `packages/convex/**`)**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/limits`
Expected: PASS (or skipped locally without a backend — note which).

- [ ] **Step 6: Commit**

```bash
git add packages/cms/src/types/content-types.ts packages/convex/convex/tables/cms.ts packages/cms/scripts/codegen
git commit -m "feat(cms): regenerate node shapes for the collection card-overrides group."
```

(If Step 2 needed no emitter change, drop `packages/cms/scripts/codegen` from the `git add`.)

---

## Task 7: End-to-end coverage for the per-instance card override

**Files:**
- Modify: `apps/admin/e2e/block-instance-overrides.spec.ts`

- [ ] **Step 1: Add the e2e test**

Append a second test to `apps/admin/e2e/block-instance-overrides.spec.ts` (the file already imports `addBlock, DOMAIN, fieldControl, waitForAutosave` and sets `RUN_TOKEN`):

```ts
test('a collection block overrides product-card settings per instance', async ({ page }) => {
    await page.goto(`/${DOMAIN}/content/pages/new/`);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/new/\\?locale=`));
    await fieldControl(page, 'title', 'input').fill(`Card override page ${RUN_TOKEN}`);
    await fieldControl(page, 'slug', 'input').fill(`card-override-page-${RUN_TOKEN}`);
    await waitForAutosave(page);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/(?!new/)[^/]+/\\?locale=`));

    await addBlock(page, 'blocks', 'collection');
    await fieldControl(page, 'blocks.0.handle', 'input').fill('men');

    // The "Card overrides" group exposes overridable product-card knobs on the block node.
    const ctaPath = 'blocks.0.productCard.ctaPlacement';
    await page.getByTestId(`override-override-${ctaPath}`).click();
    await fieldControl(page, ctaPath, 'select').selectOption('inline-button');

    await waitForAutosave(page);

    // Reload → the per-instance card override persisted on the block node.
    await page.reload();
    await expect(page.getByTestId(`override-override-${ctaPath}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(fieldControl(page, ctaPath, 'select')).toHaveValue('inline-button');
});
```

- [ ] **Step 2: Run the e2e suite (CI-representative; needs the harness)**

Run: `pnpm test:e2e --filter @nordcom/commerce-admin`
Expected: PASS. (E2E needs the seeded backend + built admin; if it cannot run in this environment, note that and rely on CI — do not delete the test.)

- [ ] **Step 3: Commit**

```bash
git add apps/admin/e2e/block-instance-overrides.spec.ts
git commit -m "test(admin): cover per-instance product-card overrides on the collection block."
```

---

## Task 8: Full verification gates

- [ ] **Step 1: Lint + typecheck the repo**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 2: Unit tests for the touched projects**

Run: `pnpm test --project @nordcom/commerce-storefront --project @nordcom/commerce-cms`
Expected: PASS, including the new `presets.test.ts` and `extensions.test.ts`.

- [ ] **Step 3: CMS codegen gate**

Run: `pnpm cms:gen:check`
Expected: PASS.

- [ ] **Step 4: Confirm clean working tree**

Run: `git status --short`
Expected: only intended files committed; nothing stray staged.

---

## Self-review notes

- **Spec coverage:** storage shape (Task 3, 6), authoring group (Task 5), inherit label "Collection default" (Task 5), codegen (Task 6), render types (Task 3), resolution instance tier (Task 1), threading (Task 4), testing (Tasks 1, 2, 7), codegen-of-overridable-in-group risk (Task 6 Step 2). All covered.
- **Naming:** `cardOverride` (prop) and `block.productCard` (node field) and `instance` (resolver param) are the three distinct names; they are consistent within their layers and converted at each boundary (`block.productCard` → `cardOverride` prop → `instance` arg).
- **Byte-identical guarantee:** Tasks 1, 2, 4 all preserve the no-override path (absent `instance`/`cardOverride`/`block.productCard` resolves to the prior three-tier result).

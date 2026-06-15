# Store-wide Default Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let merchants set store-wide defaults for storefront blocks/components (starting with product-card behavior) that cascade `platform → store → surface → per-instance`, overridable via an explicit inherit/override control, on a reusable spine that extends to all blocks and future custom blocks.

**Architecture:** Realize the already-built-but-unwired `ShopExtensionManifest` + `resolveExtensions()` as the storage/cascade home. Persist the manifest on the `shops` Convex row (same pattern as `theme`). Build the admin **Customization** hub on the canonical CMS field machinery (`RenderFields` + registry + `FieldShell`) — NOT the theme editor's bespoke `FieldRow` — and add one new descriptor modifier, `overridable()`, plus its widget, as the inherit/override spine reused everywhere. Wire `resolveExtensions()` into the storefront render path via `BlockContext.config`, feeding product-card surface selections into the existing `resolveProductCardSurface()`.

**Tech Stack:** TypeScript, Next.js 16 App Router (RSC), Convex (validators + tenant mutations), React (client widgets), Tailwind v4 + `@nordcom/nordstar`, Vitest (`pnpm test`) + `convex-test` + `@nordcom/commerce-test-convex`, Playwright (`pnpm test:e2e`), Biome.

---

## Scope note (read first)

The full goal spans four subsystems. Per `superpowers:writing-plans` scope guidance, this plan fully details **Phase 1 — the reusable spine + product-card store defaults end-to-end** (independently shippable, proves the entire architecture). Phases 2–4 are a roadmap; each becomes its own detailed plan before execution, reusing the Phase-1 spine.

- **Phase 1 (this plan):** `overridable()` modifier + widget · manifest persistence · component-settings registry (`productCard`) · storefront wiring · admin Customization hub Components tab · e2e.
- **Phase 2 (roadmap):** `BlockDescriptor.settings[]` + Blocks tab.
- **Phase 3 (roadmap):** per-instance override in the page/content editor.
- **Phase 4 (roadmap):** Sections + block-availability tabs; migrate the theme editor onto the extracted `CustomizationShell` (final DRY collapse).

Design reference: `.specs/2026-06-15-store-wide-defaults/design/*.html`. Spec: `./spec.md`.

---

## File Structure (Phase 1)

**Create:**
- `packages/cms/src/descriptors/overridable.ts` — `OverridableFieldDescriptor` type + `overridable()` builder.
- `packages/cms/src/descriptors/overridable.test.ts` — modifier unit tests.
- `packages/cms/src/editor/form/fields/overridable.tsx` — the inherit/override widget + `registerOverridableFieldWidget`.
- `packages/cms/src/extensions/component-settings.ts` — component-settings registry (`productCard` entry) + `componentSettingsDescriptors()`.
- `packages/cms/src/extensions/component-settings.test.ts` — registry shape tests.
- `packages/convex/convex/lib/extensions.ts` — `shopExtensionManifestValidator`.
- `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/customization/page.tsx` — hub route.
- `apps/admin/src/components/customization/customization-shell.tsx` — extracted tablist+search shell (client).
- `apps/admin/src/components/customization/components-tab.tsx` — Components tab field surface (client).
- `apps/admin/e2e/customization-defaults.spec.ts` — e2e.
- `apps/storefront/src/api/extensions.ts` — `ResolvedExtensionsApi({ shop })` loader.

**Modify:**
- `packages/cms/src/descriptors/types.ts` — add `'overridable'` to the descriptor union + `FieldDescriptorKind`.
- `packages/cms/src/descriptors/index.ts` (barrel) — export `overridable`, `OverridableFieldDescriptor`.
- `packages/cms/src/editor/form/registry.tsx` — register the overridable widget in the default registry assembly.
- `packages/cms/src/editor/ui/editor-fields.tsx` — call `registerOverridableFieldWidget(registry)`.
- `packages/convex/convex/tables/shops.ts` — add `extensions: v.optional(shopExtensionManifestValidator)` to `shopValidator`; export via `shopFields`.
- `packages/convex/convex/db/shop_write.ts` — add `extensions: shopFields.extensions` to `writableShopValidator`.
- `apps/storefront/src/blocks/context.ts` — add `config?: ResolvedExtensions` to `BlockContext`.
- `apps/storefront/src/components/cms/cms-content.tsx` — load extensions, pass into context.
- `apps/storefront/src/components/products/collection-product-card.tsx` + `search-product-card.tsx` — resolve surface from extensions.
- `packages/convex/convex/tables/shops.test.ts` (or nearest) — validator round-trip test.

---

## Phase 1

### Task 1: The `overridable()` descriptor modifier

A new descriptor kind that wraps a scalar field and stores `{ __mode: 'inherit' | 'override', value? }`. `inherit` (or absent) → the field contributes no key to the manifest (resolver falls through). `override` → the wrapped value is written. This is the data contract; the widget (Task 2) is the UI.

**Files:**
- Create: `packages/cms/src/descriptors/overridable.ts`
- Test: `packages/cms/src/descriptors/overridable.test.ts`
- Modify: `packages/cms/src/descriptors/types.ts`

- [ ] **Step 1: Add the descriptor kind to the union**

In `packages/cms/src/descriptors/types.ts`, add to the `NamedFieldDescriptor` union (after `ResponsiveFieldDescriptor`) and ensure it flows into `FieldDescriptor`:

```ts
export type OverridableFieldDescriptor = CompositeFieldDescriptorBase & {
    type: 'overridable';
    /** The wrapped scalar field whose value is conditionally written. */
    field: ScalarFieldDescriptor;
    /**
     * Provenance label shown on the inherit ghost (e.g. "Platform default").
     * The resolved inherited value is supplied at render time, not here.
     */
    inheritedSourceLabel?: string;
};
```

Add `| OverridableFieldDescriptor` to the `NamedFieldDescriptor` union. `FieldDescriptorKind = FieldDescriptor['type']` then includes `'overridable'` automatically. `CompositeFieldDescriptorBase` (already used by `ResponsiveFieldDescriptor`) omits `localized`, which is correct — overridable composes with `localized()` on the *wrapped* field, not itself.

- [ ] **Step 2: Write the failing test**

```ts
// packages/cms/src/descriptors/overridable.test.ts
import { describe, expect, it } from 'vitest';
import { selectField } from './builders';
import { overridable, OVERRIDE_INHERIT } from './overridable';

describe('overridable()', () => {
    it('wraps a scalar field as an overridable descriptor', () => {
        const field = overridable(
            selectField({ name: 'ctaPlacement', options: [{ label: 'Float', value: 'float-pill' }] }),
            { inheritedSourceLabel: 'Platform default' },
        );
        expect(field.type).toBe('overridable');
        expect(field.name).toBe('ctaPlacement');
        expect(field.field.type).toBe('select');
        expect(field.inheritedSourceLabel).toBe('Platform default');
    });

    it('exposes the canonical inherit sentinel', () => {
        expect(OVERRIDE_INHERIT).toEqual({ __mode: 'inherit' });
    });
});
```

- [ ] **Step 3: Run it — expect failure**

Run: `pnpm test --project @nordcom/commerce-cms -- overridable`
Expected: FAIL — `Cannot find module './overridable'`.

- [ ] **Step 4: Implement**

```ts
// packages/cms/src/descriptors/overridable.ts
import type { OverridableFieldDescriptor, ScalarFieldDescriptor } from './types';

/** Stored shape of an overridable field. `inherit` contributes no manifest key. */
export type OverridableValue<T = unknown> = { __mode: 'inherit' } | { __mode: 'override'; value: T };

/** Canonical inherit sentinel — the default/empty state. */
export const OVERRIDE_INHERIT: OverridableValue = { __mode: 'inherit' };

/**
 * Wraps a scalar field so the editor exposes an explicit inherit/override control. The wrapped
 * field's `name` becomes the overridable descriptor's name; the wrapped field is re-keyed to
 * `value` by the widget so its stored path is `<name>.value`.
 *
 * @param field - The scalar field to make overridable.
 * @param options.inheritedSourceLabel - Provenance label for the inherit ghost.
 * @returns The overridable descriptor.
 */
export const overridable = (
    field: ScalarFieldDescriptor,
    options?: { inheritedSourceLabel?: string },
): OverridableFieldDescriptor => ({
    type: 'overridable',
    name: field.name,
    label: field.label,
    field,
    inheritedSourceLabel: options?.inheritedSourceLabel,
});

/**
 * Collapses an overridable form value to the manifest representation: `override` yields the value,
 * `inherit`/absent yields `undefined` (key omitted so the cascade falls through).
 *
 * @param stored - The stored overridable value.
 * @returns The effective value or `undefined`.
 */
export const collapseOverridable = <T>(stored: OverridableValue<T> | undefined): T | undefined =>
    stored && stored.__mode === 'override' ? stored.value : undefined;
```

- [ ] **Step 5: Run tests — expect pass**

Run: `pnpm test --project @nordcom/commerce-cms -- overridable`
Expected: PASS (2 tests).

- [ ] **Step 6: Export from the descriptors barrel**

In `packages/cms/src/descriptors/index.ts` add: `export * from './overridable';` (verify the barrel path; if descriptors are re-exported through `builders`/`types` only, add the export there to match the existing pattern).

- [ ] **Step 7: Typecheck + commit**

Run: `pnpm typecheck --filter @nordcom/commerce-cms`
Expected: no errors.

```bash
git add packages/cms/src/descriptors/overridable.ts packages/cms/src/descriptors/overridable.test.ts packages/cms/src/descriptors/types.ts packages/cms/src/descriptors/index.ts
git commit -m "feat(cms): add overridable() field descriptor modifier."
```

---

### Task 2: The overridable widget

Renders the segmented Inherit/Override toggle. `inherit` shows the resolved-value ghost + source chip and stores `{__mode:'inherit'}`; `override` mounts the wrapped scalar widget at `<path>.value` via `RenderFields` and stores `{__mode:'override', value}`. Models `ResponsiveField` (Task-source §4) and reuses `RenderFields` + `useEditorField`.

**Files:**
- Create: `packages/cms/src/editor/form/fields/overridable.tsx`
- Modify: `packages/cms/src/editor/form/registry.tsx`, `packages/cms/src/editor/ui/editor-fields.tsx`
- Test: covered by e2e (Task 7); logic is exercised through `collapseOverridable` unit (Task 1) + render e2e.

- [ ] **Step 1: Implement the widget**

```tsx
// packages/cms/src/editor/form/fields/overridable.tsx
'use client';

import { useField } from '../hooks';
import { RenderFields, type FieldRendererProps } from '../registry';
import type { OverridableFieldDescriptor } from '../../../descriptors/types';
import { fieldControlClassName } from './field-shell';

const toggleBase =
    'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold text-xs transition-colors';

/**
 * Inherit/override control for an {@link OverridableFieldDescriptor}. Stores
 * `{__mode:'inherit'}` (no manifest key) or `{__mode:'override', value}`; in override mode it
 * mounts the wrapped scalar widget at `<path>.value` through {@link RenderFields}.
 *
 * @param props.field - The overridable descriptor.
 * @param props.path - Dotted form-state path.
 * @param props.registry - Field registry for rendering the wrapped widget.
 * @returns The control.
 */
export function OverridableField({ field, path, registry }: FieldRendererProps<OverridableFieldDescriptor>) {
    const { value, setValue } = useField<{ __mode?: string } | undefined>({ path });
    const mode = value?.__mode === 'override' ? 'override' : 'inherit';

    const setMode = (next: 'inherit' | 'override') => {
        if (next === mode) return;
        setValue(next === 'inherit' ? { __mode: 'inherit' } : { __mode: 'override' });
    };

    return (
        <div data-testid={`field-${path}`} className="flex min-w-0 flex-col gap-1.5">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {field.label ?? field.name}
            </span>
            <div role="group" aria-label="Inherit or override" className="inline-flex w-fit gap-1 rounded-lg border border-border bg-card/40 p-1">
                <button
                    type="button"
                    data-testid={`override-inherit-${path}`}
                    aria-pressed={mode === 'inherit'}
                    onClick={() => setMode('inherit')}
                    className={`${toggleBase} ${mode === 'inherit' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                >
                    Inherit
                </button>
                <button
                    type="button"
                    data-testid={`override-override-${path}`}
                    aria-pressed={mode === 'override'}
                    onClick={() => setMode('override')}
                    className={`${toggleBase} ${mode === 'override' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                >
                    Override
                </button>
            </div>
            {mode === 'override' ? (
                <RenderFields
                    registry={registry}
                    fields={[{ ...field.field, name: 'value', label: undefined }]}
                    parentPath={path}
                />
            ) : (
                <p data-testid={`override-inherited-${path}`} className="rounded-md border border-border border-dashed bg-card/30 px-3 py-2 text-muted-foreground text-sm">
                    Inherited{field.inheritedSourceLabel ? ` · ${field.inheritedSourceLabel}` : ''}
                </p>
            )}
        </div>
    );
}

/**
 * Registers the overridable widget under the `'overridable'` kind.
 *
 * @param registry - The field registry to extend.
 */
export function registerOverridableFieldWidget(registry: import('../registry').FieldRegistry): void {
    registry.register('overridable', OverridableField);
}
```

> Note: the wrapped scalar widget stores at `<path>.value` and the inherit-mode `{__mode:'inherit'}` object stores at `<path>`. State-build/serialize already nest object leaves (Task-source §state utils); confirm `<path>` and `<path>.value` coexist by testing serialization through the e2e save in Task 7 and, if the flat-state coexistence needs help, store mode at `<path>.__mode` instead of as an object at `<path>` (adjust `collapseOverridable` to read `<path>.__mode` + `<path>.value`). Decide this in Step 2 by reading `packages/cms/src/editor/form/state.ts` `buildInitialFormState`/`reduceFieldsToValues`.

- [ ] **Step 2: Resolve the state-shape question**

Read `packages/cms/src/editor/form/state.ts`. Confirm whether an object at `<path>` plus a leaf at `<path>.value` round-trips. If not, switch the widget to write `__mode` at `<path>.__mode` and value at `<path>.value`, and update `collapseOverridable` (Task 1) accordingly. Record the chosen shape in a one-line comment in `overridable.ts`.

- [ ] **Step 3: Register in the default assembly**

In `packages/cms/src/editor/ui/editor-fields.tsx`, where `registerScalarFieldWidgets` / `registerCompositeFieldWidgets` are called, add `registerOverridableFieldWidget(registry)` (import from `../form/fields/overridable`).

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm typecheck --filter @nordcom/commerce-cms && pnpm lint --filter @nordcom/commerce-cms`
Expected: no errors. Check LSP diagnostics on the two edited files.

- [ ] **Step 5: Commit**

```bash
git add packages/cms/src/editor/form/fields/overridable.tsx packages/cms/src/editor/ui/editor-fields.tsx packages/cms/src/descriptors/overridable.ts
git commit -m "feat(cms): add inherit/override field widget for store defaults."
```

---

### Task 3: Persist the extension manifest on the shop row

Add the Convex validator + thread it through reads/writes. Mirrors `theme`.

**Files:**
- Create: `packages/convex/convex/lib/extensions.ts`
- Modify: `packages/convex/convex/tables/shops.ts`, `packages/convex/convex/db/shop_write.ts`
- Test: `packages/convex/convex/tables/shops.test.ts` (create if absent), using `convex-test`.

- [ ] **Step 1: Write the failing validator round-trip test**

```ts
// packages/convex/convex/tables/shops.test.ts
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import schema from '../schema';
import { shopExtensionManifestValidator } from '../lib/extensions';

describe('shop.extensions', () => {
    it('accepts a partial product-card manifest', async () => {
        const t = convexTest(schema);
        const id = await t.run(async (ctx) =>
            ctx.db.insert('shops', /* minimal valid shop */ {
                legacyId: 'x', name: 'x', domain: 'x.com',
                design: { header: { logo: { width: 1, height: 1, src: '', alt: '' } }, accents: [] },
                commerceProvider: { type: 'shopify', /* required public fields */ } as never,
                extensions: { productCard: { collection: { ctaPlacement: 'inline-button' } } },
                createdAt: 0, updatedAt: 0,
            }),
        );
        const row = await t.run((ctx) => ctx.db.get(id));
        expect(row?.extensions?.productCard?.collection?.ctaPlacement).toBe('inline-button');
    });
});
```

> Fill the minimal shop literal from the real `shopValidator` required fields (Task-source §8) when writing the test.

- [ ] **Step 2: Run it — expect failure**

Run: `pnpm test --filter @nordcom/commerce-convex -- shops`
Expected: FAIL — `shopExtensionManifestValidator` missing / `extensions` not in schema.

- [ ] **Step 3: Define the validator**

```ts
// packages/convex/convex/lib/extensions.ts
import { v } from 'convex/values';

/** CMS-safe mirror of ProductCardVariantSelection (open string names). */
const productCardVariantSelectionValidator = v.object({
    layout: v.optional(v.string()),
    chrome: v.optional(v.string()),
    ctaPlacement: v.optional(v.string()),
    pickerPresentation: v.optional(v.string()),
});

/** Mirrors packages/cms ShopExtensionManifest. All-optional; absent → today's render. */
export const shopExtensionManifestValidator = v.object({
    theme: v.optional(v.any()), // ShopThemeTokens is validated via shop.theme already; manifest.theme is advisory in P1.
    chrome: v.optional(v.object({ order: v.optional(v.array(v.string())) })),
    sections: v.optional(v.record(v.string(), v.boolean())),
    blocks: v.optional(v.object({ available: v.optional(v.array(v.string())) })),
    productCard: v.optional(v.record(v.string(), productCardVariantSelectionValidator)),
});
```

- [ ] **Step 4: Add to the shop validators**

In `packages/convex/convex/tables/shops.ts`: import `shopExtensionManifestValidator`; add `extensions: v.optional(shopExtensionManifestValidator),` to `shopValidator`; ensure it's exposed on the `shopFields` map the file exports (mirror how `theme` is exposed).

In `packages/convex/convex/db/shop_write.ts`: add `extensions: shopFields.extensions,` to `writableShopValidator`. The existing `ctx.db.replace(_id, { ...previous, ...fields, ... })` merge (Task-source §9) already carries `extensions` through `definedShopFields`.

- [ ] **Step 5: Run tests — expect pass**

Run: `pnpm test --filter @nordcom/commerce-convex -- shops`
Expected: PASS.

- [ ] **Step 6: Limit-boundary gate + commit**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/limits`
Expected: PASS (touching `packages/convex/**` triggers this CI gate per CLAUDE.md).

```bash
git add packages/convex/convex/lib/extensions.ts packages/convex/convex/tables/shops.ts packages/convex/convex/db/shop_write.ts packages/convex/convex/tables/shops.test.ts
git commit -m "feat(convex): persist the shop extension manifest on the shops row."
```

---

### Task 4: Component-settings registry (productCard)

Declares product-card settings as `overridable()` descriptors, keyed by component id, with surface awareness. Feeds both the admin editor and (indirectly) the storefront.

**Files:**
- Create: `packages/cms/src/extensions/component-settings.ts`, `packages/cms/src/extensions/component-settings.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/cms/src/extensions/component-settings.test.ts
import { describe, expect, it } from 'vitest';
import { COMPONENT_SETTINGS, componentSettingsById } from './component-settings';

describe('component settings registry', () => {
    it('declares product card with surfaces and overridable settings', () => {
        const pc = componentSettingsById('productCard');
        expect(pc?.surfaces).toEqual(['collection', 'search', 'recommendation']);
        const cta = pc?.settings.find((f) => f.name === 'ctaPlacement');
        expect(cta?.type).toBe('overridable');
        expect(cta?.field.type).toBe('select');
    });

    it('is keyed and ordered', () => {
        expect(COMPONENT_SETTINGS.map((c) => c.id)).toContain('productCard');
    });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test --project @nordcom/commerce-cms -- component-settings`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// packages/cms/src/extensions/component-settings.ts
import { selectField } from '../descriptors/builders';
import { overridable } from '../descriptors/overridable';
import type { OverridableFieldDescriptor } from '../descriptors/types';

export type ComponentSettingsEntry = {
    id: string;
    label: string;
    surfaces?: readonly string[];
    settings: OverridableFieldDescriptor[];
};

const productCardSettings: OverridableFieldDescriptor[] = [
    overridable(
        selectField({
            name: 'ctaPlacement',
            label: 'CTA placement',
            options: [
                { label: 'Float pill', value: 'float-pill' },
                { label: 'Inline button', value: 'inline-button' },
            ],
        }),
        { inheritedSourceLabel: 'Platform default' },
    ),
    overridable(
        selectField({
            name: 'layout',
            label: 'Layout',
            options: [
                { label: 'Vertical', value: 'vertical' },
                { label: 'Horizontal', value: 'horizontal' },
            ],
        }),
        { inheritedSourceLabel: 'Platform default' },
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
        { inheritedSourceLabel: 'Platform default' },
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
        { inheritedSourceLabel: 'Platform default' },
    ),
];

export const COMPONENT_SETTINGS: readonly ComponentSettingsEntry[] = [
    {
        id: 'productCard',
        label: 'Product card',
        surfaces: ['collection', 'search', 'recommendation'],
        settings: productCardSettings,
    },
];

/**
 * Looks up a component-settings entry by id.
 *
 * @param id - Component id (e.g. `'productCard'`).
 * @returns The entry or `undefined`.
 */
export const componentSettingsById = (id: string): ComponentSettingsEntry | undefined =>
    COMPONENT_SETTINGS.find((entry) => entry.id === id);
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm test --project @nordcom/commerce-cms -- component-settings`
Expected: PASS.

- [ ] **Step 5: Export + commit**

Export from `packages/cms/src/extensions/index.ts` (the package's extensions entrypoint). Then:

```bash
git add packages/cms/src/extensions/component-settings.ts packages/cms/src/extensions/component-settings.test.ts packages/cms/src/extensions/index.ts
git commit -m "feat(cms): declare product-card store-default settings registry."
```

---

### Task 5: Wire `resolveExtensions` into the storefront render path

Load the manifest from the shop, resolve, thread into `BlockContext.config`, and feed product-card surface selections into `resolveProductCardSurface`.

**Files:**
- Create: `apps/storefront/src/api/extensions.ts`
- Modify: `apps/storefront/src/blocks/context.ts`, `apps/storefront/src/components/cms/cms-content.tsx`, `apps/storefront/src/components/products/collection-product-card.tsx`, `apps/storefront/src/components/products/search-product-card.tsx`
- Test: extend an existing storefront unit test for the resolver call; behavior verified by storefront e2e.

- [ ] **Step 1: Add `config` to BlockContext**

In `apps/storefront/src/blocks/context.ts`, import the type and extend:

```ts
import type { ResolvedExtensions } from '@nordcom/commerce-cms/extensions';
// ...inside BlockContext:
    /** Resolved per-shop extension config (defaults cascade source). */
    config?: ResolvedExtensions;
```

- [ ] **Step 2: Add the loader**

```ts
// apps/storefront/src/api/extensions.ts
import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';
import { resolveExtensions, type ResolvedExtensions } from '@nordcom/commerce-cms/extensions';

/**
 * Resolves the per-shop extension config for the current tenant. The manifest persists on the
 * shop row (`shop.extensions`); absent → byte-identical to today's render.
 *
 * @param shop - The tenant shop record (carries `extensions`, `theme`, `design`).
 * @returns The resolved extensions.
 */
export function ResolvedExtensionsApi({ shop }: { shop: OnlineShop }): ResolvedExtensions {
    return resolveExtensions({ shop, manifest: (shop as { extensions?: never }).extensions ?? null });
}
```

> Confirm `OnlineShop` surfaces `extensions` (the db model maps the Convex row). If the db model strips unknown fields, add `extensions` to `packages/db/src/models/shop.ts` mapping in this step.

- [ ] **Step 3: Thread into CMSContent**

In `apps/storefront/src/components/cms/cms-content.tsx`, build config once and pass it:

```tsx
import { ResolvedExtensionsApi } from '@/api/extensions';
// ...
    const config = ResolvedExtensionsApi({ shop });
    return <Blocks blocks={page.blocks as BlockNode[]} context={{ shop, locale, preview, path: 'blocks', config }} />;
```

- [ ] **Step 4: Resolve product-card surfaces from config**

Rewrite `collection-product-card.tsx` (and identically `search-product-card.tsx` with `'search'`):

```tsx
import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import { ResolvedExtensionsApi } from '@/api/extensions';
import { resolveProductCardSurface } from '@/components/product-card/presets';
import ProductCard from '@/components/product-card/product-card';
import type { Locale } from '@/utils/locale';

export type CollectionProductCardProps = {
    shop: OnlineShop; locale: Locale; data: Product; priority?: boolean; className?: string;
};

const CollectionProductCard = async ({ shop, ...props }: CollectionProductCardProps) => {
    const override = ResolvedExtensionsApi({ shop }).productCard.collection;
    const surface = resolveProductCardSurface('collection', override);
    return <ProductCard {...surface} shop={shop} {...props} />;
};
CollectionProductCard.displayName = 'Nordcom.Products.CollectionProductCard';
export default CollectionProductCard;
```

> `resolveProductCardSurface` already layers override → preset → builtin (Task-source §12), so an absent manifest renders identically to today.

- [ ] **Step 5: Typecheck + lint storefront**

Run: `pnpm typecheck --filter @nordcom/commerce-storefront && pnpm lint --filter @nordcom/commerce-storefront`
Expected: no errors. Fix LSP diagnostics.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/api/extensions.ts apps/storefront/src/blocks/context.ts apps/storefront/src/components/cms/cms-content.tsx apps/storefront/src/components/products/collection-product-card.tsx apps/storefront/src/components/products/search-product-card.tsx
git commit -m "feat(storefront): resolve store-default extensions into block + product-card render."
```

---

### Task 6: Admin Customization hub — Components tab

A new route mounting `EditorEditPage` against `shopsEditor` (like the theme page), with a `fieldSurface` that renders the Components tab from `COMPONENT_SETTINGS`. The shell (tablist+search) is extracted generically for reuse by later phases.

**Files:**
- Create: `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/customization/page.tsx`, `apps/admin/src/components/customization/customization-shell.tsx`, `apps/admin/src/components/customization/components-tab.tsx`

- [ ] **Step 1: Extract the shell (tablist + search)**

Generalize the theme editor's tablist/search (Task-source: theme-editor.tsx) into a presentational, dependency-free shell:

```tsx
// apps/admin/src/components/customization/customization-shell.tsx
'use client';
import { type ReactNode, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/tailwind';

export type CustomizationTab = { slug: string; label: string; render: (query: string) => ReactNode };

/**
 * Tabbed, searchable shell for the Customization hub. WAI-ARIA tabs pattern lifted from the theme
 * editor so all hub surfaces share one chrome.
 *
 * @param props.tabs - Tab definitions; each renders its own panel given the live search query.
 * @returns The hub shell.
 */
export function CustomizationShell({ tabs }: { tabs: CustomizationTab[] }) {
    const [active, setActive] = useState(0);
    const [query, setQuery] = useState('');
    const current = tabs[active];
    return (
        <div className="flex min-h-[60vh] flex-col gap-4">
            <Input type="search" aria-label="Search settings" placeholder="Search settings…" value={query}
                onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
            <div role="tablist" aria-label="Customization sections" className="flex flex-wrap gap-1 border-border border-b">
                {tabs.map((t, i) => (
                    <button key={t.slug} type="button" role="tab" aria-selected={i === active}
                        onClick={() => setActive(i)}
                        className={cn('-mb-px border-b-2 px-3 py-2 font-bold text-sm uppercase tracking-wide transition-colors',
                            i === active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                        {t.label}
                    </button>
                ))}
            </div>
            <div role="tabpanel">{current?.render(query)}</div>
        </div>
    );
}
```

- [ ] **Step 2: Components tab surface**

Render each `COMPONENT_SETTINGS` entry's surfaces + settings through the canonical registry. Mounts inside the editor `<Form>` (same as `ThemeEditor`), reading/writing `extensions.productCard.<surface>.<name>` paths.

```tsx
// apps/admin/src/components/customization/components-tab.tsx
'use client';
import { COMPONENT_SETTINGS } from '@nordcom/commerce-cms/extensions';
import { createFieldRegistry, RenderFields } from '@nordcom/commerce-cms/editor/form';
import { registerScalarFieldWidgets, registerCompositeFieldWidgets } from '@nordcom/commerce-cms/editor/form/fields';
import { registerOverridableFieldWidget } from '@nordcom/commerce-cms/editor/form/fields/overridable';
import { useState } from 'react';

/**
 * Components tab: store-wide component defaults rendered from COMPONENT_SETTINGS via the canonical
 * field registry. Each setting writes under `extensions.<id>.<surface>.<name>`.
 *
 * @returns The Components tab panel.
 */
export function ComponentsTab() {
    const [registry] = useState(() => {
        const r = createFieldRegistry();
        registerScalarFieldWidgets(r);
        registerCompositeFieldWidgets(r);
        registerOverridableFieldWidget(r);
        return r;
    });
    return (
        <div className="flex flex-col gap-6">
            {COMPONENT_SETTINGS.map((entry) => {
                const surface = entry.surfaces?.[0] ?? 'default';
                const parentPath = `extensions.${entry.id}.${surface}`;
                return (
                    <section key={entry.id} aria-label={entry.label} className="rounded-xl border border-border">
                        <header className="border-border border-b p-4 font-bold">{entry.label}</header>
                        <div className="flex flex-col divide-y divide-border p-4">
                            <RenderFields registry={registry} fields={entry.settings} parentPath={parentPath} />
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
```

> Surface switching (collection/search/recommendation pills) is additive: hold the active surface in state and recompute `parentPath`. Add after the single-surface path round-trips in e2e (Task 7) to keep this task small.

- [ ] **Step 3: The route**

```tsx
// apps/admin/src/app/(app)/(dashboard)/[domain]/settings/customization/page.tsx
import 'server-only';
import { shopsEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata, Route } from 'next';
import { CustomizationShell } from '@/components/customization/customization-shell';
import { ComponentsTab } from '@/components/customization/components-tab';
import { ThemeEditor } from '@/components/theme-editor/theme-editor';
import * as actions from '@/lib/cms-actions/_generated/shops';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Customization' };
type Props = { params: Promise<{ domain: string }>; searchParams: Promise<{ locale?: string }> };

export default async function CustomizationPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={shopsEditor}
            runtime={editorRuntime}
            params={{ domain, id: domain }}
            searchParams={sp}
            selfPath={`/${domain}/settings/customization/` as Route}
            fieldSurface={
                <CustomizationShell tabs={[
                    { slug: 'theme', label: 'Theme', render: () => <ThemeEditor /> },
                    { slug: 'components', label: 'Components', render: () => <ComponentsTab /> },
                ]} />
            }
            generatedActions={{
                saveDraft: actions.shopsSaveDraft, publish: actions.shopsPublish, create: actions.shopsCreate,
                delete: actions.shopsDelete, bulkDelete: actions.shopsBulkDelete, bulkPublish: actions.shopsBulkPublish,
                restoreVersion: actions.shopsRestoreVersion,
            }}
        />
    );
}
```

> The shop editor schema must include the `extensions.*` paths so the editor form round-trips them. Verify `packages/cms/src/editor/collection-fields.ts` `shops` schema; if it gates fields by descriptor, add an `extensions` group descriptor (or rely on `_payload` passthrough as the theme editor does for `theme.*`). Read `collection-fields.ts` shops entry first and match the theme approach exactly.

- [ ] **Step 4: Add nav + redirect**

Add a "Customization" item to the settings nav (find the settings nav source under `apps/admin/src/components` or the settings layout) and make `/settings/theme` redirect to `/settings/customization?...` (Next redirect in the theme page, or a nav change — match existing redirect patterns). Keep `/settings/theme` working until Phase 4 migration.

- [ ] **Step 5: Typecheck + lint + build admin**

Run: `pnpm build:packages && pnpm typecheck --filter @nordcom/commerce-admin && pnpm lint --filter @nordcom/commerce-admin`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/app/'(app)'/'(dashboard)'/'[domain]'/settings/customization/ apps/admin/src/components/customization/
git commit -m "feat(admin): add Customization hub with store-wide component defaults."
```

---

### Task 7: End-to-end coverage

**Files:**
- Create: `apps/admin/e2e/customization-defaults.spec.ts`

- [ ] **Step 1: Write the spec**

Drive the real app (reuse `e2e/global-setup.ts`, `E2E_SHOP_DOMAIN`). Assert through the native field shells + override testids.

```ts
// apps/admin/e2e/customization-defaults.spec.ts
import { expect, test } from '@playwright/test';

const DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

test('store-wide product-card CTA default overrides and persists', async ({ page }) => {
    await page.goto(`/${DOMAIN}/settings/customization/`);
    await page.getByRole('tab', { name: 'Components' }).click();

    const path = 'extensions.productCard.collection.ctaPlacement';
    await expect(page.getByTestId(`field-${path}`)).toBeVisible();

    // Default = inherit; flip to override and choose inline-button.
    await page.getByTestId(`override-override-${path}`).click();
    await page.getByTestId(`field-${path}.value`).locator('select').selectOption('inline-button');

    // Publish and wait for autosave/publish quiescence.
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);

    // Reload → override persisted.
    await page.reload();
    await page.getByRole('tab', { name: 'Components' }).click();
    await expect(page.getByTestId(`override-override-${path}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId(`field-${path}.value`).locator('select')).toHaveValue('inline-button');
});
```

> Stamp a unique run token / restore state per CLAUDE.md rerun-safety (reset to inherit at test end).

- [ ] **Step 2: Run e2e**

Run: `pnpm test:e2e --filter @nordcom/commerce-admin -- customization-defaults`
Expected: PASS. Debug selectors against the real DOM if needed.

- [ ] **Step 3: Changeset + commit**

Touched non-ignored packages (`@nordcom/commerce-cms`, `@nordcom/commerce-convex`, `@nordcom/commerce-storefront`, `@nordcom/commerce-admin`). Create a changeset:

Run: `pnpm changeset` → pick `minor` (additive API) → WHY-only summary.

```bash
git add apps/admin/e2e/customization-defaults.spec.ts .changeset/
git commit -m "test(admin): cover store-wide product-card defaults e2e."
```

- [ ] **Step 4: Full gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm cms:gen:check`
Expected: all PASS. (`cms:gen:check` confirms no descriptor codegen drift — if the new descriptor kind changed generated output, run `pnpm cms:gen` and commit the regenerated files.)

---

## Roadmap (subsequent plans — reuse the Phase-1 spine)

- **Phase 2 — Blocks tab.** Add `settings?: FieldDescriptor[]` to `BlockDescriptor` (`packages/cms/src/descriptors/types.ts`); populate alert/collection settings; Blocks tab renders each block's `settings` via `overridable()` into `extensions.blocks.<slug>.*`; storefront block components read `context.config`.
- **Phase 3 — Per-instance override.** Render a block's `settings[]` (as `overridable()`) inside the page editor's block row "Settings" group, writing into the block node; storefront resolves `instance → store → platform`. Inline cascade trace (design screen 02).
- **Phase 4 — Sections + availability + theme migration.** Sections/blocks-availability tabs; migrate `ThemeEditor`'s `FieldRow`/control-registry onto the shared `FieldShell` + `CustomizationShell` (final DRY collapse); `/settings/theme` fully redirects.

---

## Self-Review (Phase 1)

**Spec coverage:** §3 decisions 1–4 → Tasks 1–6; §4 cascade (platform→store→surface) → Task 5 (`resolveProductCardSurface` precedence) + Task 6 (surface path); §6 settings contract (component registry) → Task 4 ((block.settings deferred to Phase 2, noted); §7 DRY spine (`overridable()` + shared shell) → Tasks 1–2, 6; §8 data model → Task 3; §9 storefront → Task 5; §11 testing → Tasks 1–7. Per-instance (§4 instance tier) explicitly deferred to Phase 3.

**Placeholder scan:** Two intentional read-first checkpoints (Task 2 Step 2 state-shape; Task 6 Step 3 shops schema) are decision points with a concrete fallback specified, not placeholders. No "TBD"/"add error handling"/"similar to" left.

**Type consistency:** `OverridableValue` / `__mode` / `collapseOverridable` consistent across Tasks 1–2; `ComponentSettingsEntry` fields (`id`/`label`/`surfaces`/`settings`) consistent Tasks 4 & 6; `ResolvedExtensions` import path `@nordcom/commerce-cms/extensions` consistent Tasks 5; `extensions` field name consistent Convex (Task 3) ↔ loader (Task 5) ↔ editor paths (Task 6).

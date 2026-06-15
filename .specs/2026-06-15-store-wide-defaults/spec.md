# Store-wide default configuration

**Status:** design — iterating on mocks before plan/implementation.
**Date:** 2026-06-15
**Design mocks (canonical, this spec refers to them):**

- [`design/index.html`](./design/index.html) — decisions, cascade model, control anatomy
- [`design/customization-hub.html`](./design/customization-hub.html) — the unified editor, all four tabs
- [`design/override-affordance.html`](./design/override-affordance.html) — control states + per-instance Settings group
- [`design/styles.css`](./design/styles.css) — shared mock tokens (lifted from `apps/admin`)

---

## 1. Problem

Storefront blocks and components have behavioral knobs — product-card CTA placement, card
layout, collection items-per-row, alert severity, section visibility — that are hard-coded at
the call site today. Merchants can't set a store-wide default, and there's no place to override
one default for a single block instance. We want:

> Store-wide defaults that cascade to **every** block and component, overridable where it
> matters, extensible to future custom user-provided blocks — reusing (and improving) the
> theme-editor and CMS-editor machinery rather than copying it.

## 2. What already exists (do not rebuild)

- **`packages/cms/src/extensions/manifest.ts`** — `ShopExtensionManifest` already models
  `productCard` per-surface variant selection, `chrome.order`, `sections` visibility,
  `blocks.available`. **Designed but never wired into the storefront render path.**
- **`packages/cms/src/extensions/resolve.ts`** — `resolveExtensions()` composes manifest over
  built-in defaults. Also unwired.
- **CMS field machinery** — `FieldDescriptor` union + builders (`packages/cms/src/descriptors`),
  the widget registry + `FieldShell` (`packages/cms/src/editor/form`), the locale-bucket and
  responsive "base + override" widgets. This is the reuse target.
- **Theme editor** — `apps/admin/src/components/theme-editor/*` is a bespoke catalog/tab/search
  surface that **reinvents** `FieldShell` as `FieldRow` and has its own control registry. This
  is the DRY target: extract the shell, keep the catalog.
- **Product card** — `ctaPlacement` / `layout` / `chrome` / `pickerPresentation` props already
  exist; CTA + picker are runtime-extensible registries. `SURFACE_PRESETS`
  (`apps/storefront/src/components/product-card/presets.ts`) hard-codes the per-surface config.

## 3. Decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Realize the manifest; unify the UI.** `ShopExtensionManifest` becomes the storage + cascade home for behavioral defaults, wired into storefront render. The admin editor renders theme tokens *and* component/block defaults through **one shared shell** extracted from the theme editor. |
| 2 | **Four-level cascade with an explicit inherit/override affordance.** `platform → store → surface → per-instance`, last-write-wins per setting. Empty = inherit. |
| 3 | **Two declaration paths feeding one editor.** Blocks declare `settings: FieldDescriptor[]` next to content `fields`; non-block components register via a small component-settings registry. Custom blocks get settings support for free via their descriptor. |
| 4 | **A unified "Customization" hub** with tabs Theme · Components · Blocks · Sections. Existing theme catalog becomes the Theme tab; search spans the hub; `/settings/theme` redirects in. |

## 4. The cascade

Resolution is **per setting key**, last-write-wins down the chain. A tier contributes only the
keys it explicitly sets; everything else falls through.

```
platform default      built-in baseline, always present        cta = "float-pill"
  ↓ overridden by
store default         this editor, store-wide                  cta = "inline-button"
  ↓ overridden by
surface               per usage context (collection/search/…)  search.cta = "float-pill"
  ↓ overridden by
per-instance          one block on one page (content editor)   block.cta = "inline-button"
```

- **Surface** tier applies only to components rendered in multiple contexts (product card today:
  `collection` / `search` / `recommendation`). Components with a single presentation (header
  chrome) skip it.
- **Resetting** a level clears its value and re-exposes the next tier up — it never deletes a
  parent's value.

Tier colors (gray / pink / amber / green) are a shared visual language: the cascade diagram and
the per-field **source chips** use the identical palette so provenance is legible at a glance.

## 5. Affordance decisions (resolved during iteration)

| Choice | Resolution | Rationale |
|--------|-----------|-----------|
| Source provenance | Color-coded tier chip per field | Reused in the cascade diagram; high legibility; one mental model |
| Surface selector | Pills | Compact, reads as secondary to the settings themselves |
| Inherit/override | Segmented `Inherit ↔ Override` toggle | Explicit, discoverable, keyboard-accessible; mirrors responsive "add device" + locale-bucket base/override |
| Cascade trace | Inline only at the per-instance tier | That's where the chain is deepest/most confusing; redundant in the 2-tier store editor |
| Theme grouping | Keep folding radii/spacing/elevation into "Layout" | Matches today, lower cognitive load |
| Hub legibility | Header override count + per-section "Reset section" + source legend | At-a-glance cascade state without opening every field |

## 6. Settings contract

```ts
// Blocks — extend the existing descriptor (packages/cms/src/descriptors/types.ts)
type BlockDescriptor = {
  slug: string;
  fields: FieldDescriptor[];      // existing: content
  settings?: FieldDescriptor[];   // NEW: behavioral defaults, cascade-aware
};

// Non-block components — a small registry keyed by component id
type ComponentSettingsEntry = {
  id: string;                     // 'productCard', 'chrome'
  label: string;
  group: 'Components';
  surfaces?: readonly string[];   // ['collection','search','recommendation'] | undefined
  settings: FieldDescriptor[];
};
```

Both sources feed the same editor and the same storefront resolver. A **future custom block**
ships a `BlockDescriptor` with `settings[]` and appears in the Blocks tab automatically — no
editor changes. (v1 ships built-ins + the registration seam; end-user block uploads are out of
scope.)

## 7. DRY extraction

The single most important non-obvious win: **one field-rendering shell**, not three.

- Extract the theme editor's catalog → tab → cluster → search shell into a generic, reusable
  `ConfigEditor` surface (lives in `packages/cms/src/editor` so admin imports it; client-safe).
- Collapse theme editor's `FieldRow` and CMS `FieldShell` into one shared field shell
  (keep the `field-<dotted.path>` test-id contract).
- The inherit/override behavior becomes **one new descriptor modifier** — `overridable(field)` —
  sibling to today's `localized(field)` and the responsive widget. The store editor and the
  block Settings group mount the *identical* widget; only the active tier differs. This is the
  reuse spine: no per-field bespoke override code.

## 8. Data model (Convex)

`ShopExtensionManifest` persists on the `shops` row (same pattern as `theme?: ShopThemeTokens`),
written through `db/shop_write:upsertShop`, deep-partial so absent keys fall through at read
time via `resolveExtensions()`. Per-instance overrides live inside the block node itself in the
page document (the content editor already round-trips arbitrary block fields).

- **Scoping:** inherits shop-level scoping automatically (manifest is on the tenant root).
- **Localization:** settings are generally non-localized (enums/booleans). Any localized setting
  reuses the existing locale-bucket; the override widget composes with `localized()`.

## 9. Storefront integration

- Fetch the manifest alongside the page; call `resolveExtensions({ shop, manifest })`.
- Add `config?: ResolvedExtensions` to `BlockContext` (`apps/storefront/src/blocks/context.ts`).
- Block components read `context.config` for their store defaults, then layer per-instance block
  props on top.
- Product card: replace hard-coded `SURFACE_PRESETS` lookup with
  `platform → store → surface(context) → instance` resolution.

## 10. Open questions (carry into plan)

- **Responsive settings:** a setting could itself be responsive (CMS has responsive fields). How
  do `overridable()` and the responsive widget compose — override-per-breakpoint, or override
  the whole responsive map? Lean: override the whole map for v1, revisit.
- **Surface extensibility:** surface keys are product-card-specific today. Generalize the surface
  list per component, or keep it ad-hoc until a second multi-surface component appears?
- **Draft/publish for defaults:** reuse the editor draft/publish + autosave + version restore the
  CMS already has, or treat defaults as immediate-save settings? Lean: reuse draft/publish for
  consistency with theme.
- **Access control:** which `EditorAccess` tier gates the Customization hub.

## 11. Testing (required, per CLAUDE.md)

- Playwright e2e under `apps/admin/e2e/*.spec.ts`: drive the hub through the native field shells
  (`field-<dotted.path>`), toggle inherit/override, assert resolved values, save/publish, and a
  per-instance override in the page editor. Wait on autosave quiescence.
- Unit coverage for `resolveExtensions()` cascade precedence (the four tiers) and `overridable()`
  serialization (inherit = absent key).

## 12. Out of scope (v1)

End-user uploaded/remote block code; a marketplace of component variants; migrating existing
hard-coded call sites beyond product card + the built-in blocks listed in the Blocks tab.

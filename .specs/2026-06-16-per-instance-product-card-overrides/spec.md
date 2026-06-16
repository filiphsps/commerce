# Per-instance product-card overrides on the collection block

## Context

The store customization **Setting cascade** (ADR 0004) defines four tiers for a multi-surface
component setting, lowest → highest: platform preset → store-wide `base` → per-surface override →
per-instance override. For the **Product card**, the per-instance tier "rides on the **Block** node
that hosts it" — but it is not wired. Today:

- `resolveProductCardSurface(surface, override?, base?)` resolves only three tiers
  (`override ?? base ?? preset`), where `override` is the per-surface store selection.
- `productCardSurfaceForShop(shop, surface)` resolves card settings from `{shop, surface}` alone.
- `CollectionBlock` forwards only its own `defaultLayout` (a **Block setting**) and passes nothing
  product-card-related to the cards it renders.

So a specific collection block on a specific page cannot deviate the cards it renders from the
collection-surface default. This spec wires that per-instance tier end to end.

ADR 0004's consequences already record this as a confirmed-but-unbuilt gap.

## Goal

Let an operator override the product-card presentation for the cards rendered by **one collection
block instance on one page**, authored on that block in the page editor, resolved as the highest
tier of the existing cascade.

## Non-goals

- No new card knobs — only the existing four (`layout`, `chrome`, `ctaPlacement`,
  `pickerPresentation`).
- No generalization to other blocks — the collection block is the only card-hosting block today.
  The mechanism (a group field on the block) generalizes later without rework; nothing general is
  built now.
- No tier-aware inherit-source label in the page editor (see Inherit label).
- No change to the store-wide Components tab or the per-surface tiers.

## Design

### Storage shape

The collection block node gains an optional `productCard` override, a `ProductCardSurfaceOverride`
(every field optional):

```
block.productCard?: {
  layout?: 'vertical' | 'horizontal'
  chrome?: 'boxed' | 'frameless'
  ctaPlacement?: 'float-pill' | 'inline-button'
  pickerPresentation?: 'auto' | 'float' | 'sheet' | 'inline'
}
```

Partial — an absent/`undefined` field inherits the next tier down. Stored on the block node in the
page document (same place as `defaultLayout` / `layout`).

> Naming trap: the card `layout` (vertical/horizontal — card orientation) is distinct from the
> collection block's own content `layout` (grid/carousel — grid arrangement). They coexist on the
> node and are independent.

### Authoring (CMS descriptor + editor)

Add a `group` field named `productCard`, label "Card overrides", to the collection block
descriptor's `fields` (`packages/cms/src/blocks/registry.ts`). Its children are the four product-card
knobs wrapped in `overridable()`, reusing the same select options as the `COMPONENT_SETTINGS`
productCard descriptors.

The page editor's `BlocksField` already renders `descriptor.fields` per block row via `RenderFields`,
so the group appears automatically as a labeled section — **distinct from the block-settings
"Overrides" group** (which renders `descriptor.settings`). No change to `BlocksField`. The
`overridable()` widget supplies the per-field inherit/override control; absence = inherit.

### Inherit label

Each card-override field's inherit ghost shows a simple static label — "Collection default" — meaning
the field falls through to the resolved collection-surface card config. It is **not** tier-aware in
the page editor: the page editor does not resolve the shop's cascade (per-surface/base/preset), so it
cannot name the precise source the way the Components tab does. Tier-aware naming here is a possible
later enhancement, out of scope.

### Codegen

`block.productCard` flows through `pnpm cms:gen`:

- `packages/cms/src/types/content-types.ts` — the generated `CollectionBlockNode` shape gains
  `productCard?` with the four optional fields.
- `packages/convex/convex/tables/cms.ts` — the collection block node validator gains the matching
  optional object.

CI gate: `pnpm cms:gen:check`.

### Render types

`packages/cms/src/blocks/render/types.ts` — `CollectionBlockNode` gains the same optional
`productCard?` shape so the render side type-checks.

### Resolution (storefront)

`resolveProductCardSurface` (`apps/storefront/src/components/product-card/presets.ts`) gains a new
highest-precedence `instance` tier:

```
resolveProductCardSurface(surface, override?, base?, instance?)
  → instance?.x ?? override?.x ?? base?.x ?? preset.x   (per field)
```

Update the JSDoc so the already-mentioned "per-instance" tier is real. Byte-identical when `instance`
is absent.

`productCardSurfaceForShop(shop, surface, instance?)` (`apps/storefront/src/api/extensions.ts`)
accepts the per-instance override and passes it through.

### Threading

`CollectionBlock` (`apps/storefront/src/blocks/collection.tsx`) reads `block.productCard` and threads
it through the card render path: `CollectionBlockComponent` → each `CollectionProductCard` →
`productCardSurfaceForShop(shop, 'collection', instance)`. With `block.productCard` absent the render
is byte-identical to today.

## Testing (TDD)

- `presets.test.ts` — `resolveProductCardSurface` instance-tier precedence: `instance` beats
  per-surface/base/preset per field; partial instance fields fall through; absent `instance` is
  byte-identical to the three-tier result.
- `extensions.test.ts` — `productCardSurfaceForShop` threads the instance override into the resolver.
- Collection threading — `CollectionBlock` passes `block.productCard` to the card render path.
- Admin — the editor renders the "Card overrides" group on a collection block row; extend
  `apps/admin/e2e/block-instance-overrides.spec.ts` so a per-instance card override persists across
  reload and resets.
- `pnpm cms:gen:check` stays green after the descriptor change + codegen run.

## Affected files

- `packages/cms/src/blocks/registry.ts` — add the `productCard` group to the collection block fields.
- `packages/cms/src/types/content-types.ts` — generated (cms:gen).
- `packages/cms/src/blocks/render/types.ts` — `CollectionBlockNode.productCard?`.
- `packages/convex/convex/tables/cms.ts` — generated (cms:gen).
- `apps/storefront/src/components/product-card/presets.ts` — `instance` tier.
- `apps/storefront/src/api/extensions.ts` — thread `instance`.
- `apps/storefront/src/blocks/collection.tsx` (+ the card render path) — read and thread
  `block.productCard`.
- `apps/admin/e2e/block-instance-overrides.spec.ts` — e2e coverage.

## Risks / to verify in planning

- **Codegen of `overridable()` nested in a `group`.** Today `overridable()` is used at the top level
  of a block's `settings`; nesting overridable fields inside a content `group` is a new combination.
  The plan must confirm `pnpm cms:gen` emits the expected `productCard?: { layout?: … | null; … }`
  shape for both `content-types.ts` and the Convex validator. If codegen does not recurse correctly
  through a group of overridable fields, fixing the emitter is part of this change (do not work around
  it by dropping the inherit/override widget).

## Scope note

Collection block only. The group-field authoring pattern and the resolver `instance` tier are
reusable, so a future card-hosting block adopts the same shape without rework — but no generalization
is implemented in this change.

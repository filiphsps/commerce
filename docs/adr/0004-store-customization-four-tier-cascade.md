# Store customization resolves through a four-tier per-key cascade

A **Component setting** or **Block** setting resolves per key, last-write-wins, across four tiers, lowest → highest:

```
platform default        built-in baseline; for a multi-surface component the per-surface SURFACE_PRESETS
store-wide default       the manifest `base` bucket — one value across every surface
per-surface override     extensions.<component>.<surface> — one usage context (collection/search/recommendation)
per-instance override    the block node in the page document — one block on one page
```

An absent key inherits the next tier down. A **store-wide value overrides the platform's per-surface presets**, so a merchant who sets one value reaches every surface; the per-surface and per-instance tiers carve out exceptions.

Storage mirrors the responsive widget's `ResponsiveValue` (`{ base, ...overrides }`): a reserved `base` bucket beside the per-surface buckets, resolved with one extra `?? base[key]` step — rather than a setting-outer per-field `{ base, search }` map. The surface-outer + `base` shape is a minimal delta from the existing surface-bucket storage and resolver; the extra fidelity of the setting-outer form did not earn the churn.

## Why this is recorded

The locked spec (`.specs/2026-06-15-store-wide-defaults`) defined this cascade, but the first implementation dropped the store-wide tier and kept only per-surface buckets — a merchant could not change all surfaces at once, and a surface field's inherit label hardcoded "Platform default" even when a store-wide value existed. This ADR records the corrected, intended model so the store-wide tier is not re-dropped.

## Consequences

- Store-wide overriding the platform per-surface presets is a sharp tool: a store-wide `layout` flips search's intentional `horizontal` layout. The per-surface tier is the escape hatch.
- Cascade depth varies — multi-surface components (the **Product card**) have all four tiers; single-surface components (the build-notifier banner) and **Block** defaults skip the per-surface tier.
- The `overridable()` inherit label must be tier-aware: a surface field inherits from the `base` value, not "Platform default".
- Implementation gap as of this ADR (not yet built): the `base` bucket, the `?? base[key]` resolver step in `resolveProductCardSurface`, the "Base · all surfaces" authoring pill in `components-tab.tsx`, and tier-aware inherit labels.
- The **per-instance tier for the Product card** is intended but not yet wired (confirmed 2026-06-16): a hosting **Block** (the collection block) must thread per-instance product-card overrides into the cards it renders — today `CollectionBlock` forwards only its own `defaultLayout`, and `productCardSurfaceForShop` resolves card settings from `{shop, surface}` alone (platform → store-wide base → per-surface), with no per-instance argument. The per-instance tier is realized only for **Block** settings (collection `defaultLayout`) so far.

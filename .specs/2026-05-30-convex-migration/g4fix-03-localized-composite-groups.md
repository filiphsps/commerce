# G4FIX-03 — localized composite groups: decision record

## Defect

`linkField()` defaulted to `localized: true` on the GROUP descriptor (and `seoGroup()`
declared it explicitly), but the native editor's `GroupField` widget recursed children at
nested paths without ever consulting the flag — every "localized" group was silently
locale-shared. The generated `localized_paths.ts` simultaneously reserved whole-group
bucket paths (`items.*.link`, `cta`, `seo`) the editor could never produce. Payload
localized the whole group per locale; the native path did not. Silent divergence was the
forbidden state.

## Evidence (corpus inspection, 2026-06-11)

1. **Mongo-era seed corpus** (`packages/test-mongo/src/seed/fixtures/header.ts`, the
   depth-5/6 nav tree): every nav `link` group and `description` is a PLAIN single-locale
   value. Zero locale buckets in any group.
2. **Convex seed corpus** (`packages/test-convex/src/seed/fixtures/*`): all `seo` groups
   and link groups are plain single-locale objects.
3. **ETL corpus** (`scripts/etl/{transform,rehearsal,reconcile}` fixtures): locale buckets
   appear ONLY on leaves (`title`, `body`, `excerpt`, `caption`). No whole-group bucket
   anywhere; the ETL has no group-bucket transform (only the rich-body shred and the media
   caption flatten) — had Payload-era production data stored per-locale groups, PIPELINE-02
   would have needed to map them.
4. **Native editor output**: `GroupField` has always written plain children paths, so every
   post-cutover save stores plain (locale-shared) groups.

Conclusion: NO per-locale divergence exists in any localized composite group in the
corpus. Whole-group localization was never exercised.

## Decision

Re-declare composite localization as LEAF-LEVEL on the text-ish members — matching how
editors actually localize navs and avoiding whole-group duplication of locale-invariant
destinations (`kind`/`url`/relations):

- `linkField({ localized })` now localizes the `label` leaf (default stays `true`); the
  group itself is never localized.
- `seoGroup()` localizes `title`, `description`, `keywords`; `image`/`noindex` stay shared.
- The frozen localized-field set moved 35 → 43 entries
  (`packages/cms/src/collections/localized-fields.test.ts`).

## Making the silent class impossible

- **Type level**: `GroupFieldDescriptor`, `ArrayFieldDescriptor`, and
  `BlocksFieldDescriptor` omit `localized` entirely (`CompositeFieldDescriptorBase`), and
  the `localized()` modifier only accepts `LocalizableFieldDescriptor` (leaves).
- **Codegen level**: `emit-localized-paths.ts` throws the typed
  `LocalizedCompositeFieldError` (`@nordcom/commerce-errors`) when a structurally-built
  schema carries `localized: true` on a composite kind, so the flag can never again be
  silently ignored.

## Read-seam consequences

- `CMS_LOCALIZED_FIELDS_BY_COLLECTION` dropped its `seo` entries (the top-level resolver
  cannot reach `seo.title`); `articles` joined `DEEP_LOCALIZED_COLLECTIONS` so its nested
  SEO leaves collapse through the path-gated deep walk.
- Plain (corpus) values pass through both resolvers unchanged, so storefront goldens and
  the SFREAD-01 contract are byte-identical for all existing data.

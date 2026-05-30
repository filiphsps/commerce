# Theme Editor + Live Storefront Preview — Specification

**Path:** `.specs/2026-05-30-theme-editor/spec.md`
**Status:** Approved approach — "Theme Editor + Live Storefront Preview" (winner, score 24) with grafts from the auto-render-first and three-pane variants.

---

## 1. Overview & Motivation

### What
A merchant-facing, Shopify-style **Theme Editor** for the multi-tenant admin (`apps/admin`) that edits every `ResolvedShopTheme` token (colors, typography, radii, spacing, elevation, ~94 product-card knobs) plus data-driven section-enablement flags, and streams **unsaved** edits into a **live storefront iframe** with zero save and zero reload.

### Why
The shop record already carries a full `theme` group (`packages/cms/src/collections/shops.ts:85`) that round-trips through the existing Payload `saveDraft`/`publish` pipeline, and the storefront already serializes that theme into CSS custom properties (`apps/storefront/src/utils/css-variables.tsx`). What's missing is a **customizer surface**: a grouped, control-rich UI with instant visual feedback. Today editors would face Payload's generic auto-rendered field tree over ~95 knobs — a settings form, not a customizer.

### Core design spine (shared across all evaluated approaches, non-negotiable)
1. **One token-metadata catalog** colocated with `theme.ts` in `packages/db` — the single source the UI, the field builder, and the serializer iterate. It carries **no default values** (deep-got from `THEME_DEFAULTS`) so defaults stay single-sourced.
2. **One pure isomorphic serializer** `serializeThemeToCssVars(theme, branding)` extracted from `css-variables.tsx` into `theme.ts` — SSR and live preview compute the **same** `[cssVar, value]` map, guaranteeing preview == eventual published render **byte-for-byte**.
3. **`useField` writes at persisted dotted paths** (`theme.colors.background`, `theme.productCard.ctaBg`, …) inside Payload's `<Form>`, so the existing `boundSaveDraft`/`boundPublish` toolbar serializes and persists with **zero action changes**.
4. **Preview over `postMessage`**, gated on the storefront preview cookie; `draftMode` continues to own draft **content** only.
5. **Never add `theme` to `isHiddenEditorField`** — that predicate is consulted in both the render filter (`editor-fields.tsx:30`) and `stripHiddenFieldState` (`build-cms-form-state.ts:91`), so hiding theme there would strip it from `FormState` and break the round-trip.

### Grafts folded in (from non-winning approaches)
- **Reuse the existing `livePreview?: ReactNode` slot** on `EditorEditPage` (declared `editor-edit-page.tsx:41`, rendered `:185`) to mount `LivePreviewIframe` + the preview bridge — confirmed present, lowest-risk wiring. **Do not** stand up a parallel `DocumentForm` mount.
- **Keep a catalog-driven Payload-field builder** as a fallback/migration baseline for the shop route's native theme group, and let Payload's native widget render for value kinds that gain nothing from custom UI (number, checkbox, single-option enum) to cut bespoke-control count.
- **Three-pane shell** with a sticky center iframe and a desktop/mobile **viewport toggle**, plus a `?cluster=` deep-link so nav state survives reload.
- **Cluster headers show a knob count** and deprecated/forthcoming **pills**; LEGACY (~40) knobs sit behind an **Advanced** disclosure.
- **Explicit iframe load/ready handshake** (not just exposing the ref) so the first `postMessage` isn't dropped before the iframe mounts; **on reset send `removeProperty`** (not the resolved default) so derived accent light/dark and `focusRing: var(--accent)` keep tracking runtime derivation.

---

## 2. The Token Catalog (complete, grouped)

The catalog is a flat `readonly` array `THEME_TOKEN_CATALOG: ThemeTokenMeta[]` in `packages/db/src/lib/theme-catalog.ts`. Every entry mirrors exactly one `ResolvedShopTheme` leaf. **Full parity already exists** in both directions (every `shops.ts` theme field ↔ every `theme.ts` token), enforced by a CI bijection test.

### `ThemeTokenMeta` shape
```ts
type ValueKind = 'color' | 'dimension' | 'number' | 'enum' | 'boolean';
type ThemeTokenMeta = {
  group: 'colors' | 'typography' | 'radii' | 'spacing' | 'elevation' | 'productCard' | 'sections';
  cluster: string;                 // sub-grouping for nav (see tables)
  path: string;                    // persisted dotted FormState/useField key, e.g. 'theme.productCard.bg'
  cssVar: string;                  // emitted custom property (structured groups: hand-authored; productCard: generated)
  valueKind: ValueKind;
  payloadType: 'text' | 'select' | 'number' | 'checkbox';  // for the fallback builder
  enumValues?: readonly string[];
  quoted?: true;                   // serializer wraps in CSS quotes on emit
  deprecated?: true;               // LEGACY knob, slated for Phase-3 product-card removal
  forthcoming?: true;              // exposed but no storefront consumer yet (no-op in preview)
  derived?: true;                  // optional/absent by default; reset CLEARS (setValue undefined), never writes
  // NO `default` field — UI deep-gets the default from THEME_DEFAULTS at `path`.
};
```

### CSS-var mapping rule (two distinct rules — encode both)
- **Structured groups (everything except `productCard`):** NO mechanical rule. Each `cssVar` is hand-authored in the catalog, copied verbatim from the JSDoc on `ResolvedShopTheme` (`packages/db/src/lib/theme.ts`). Many have semantic aliases the storefront defines (e.g. `--color-block` aliased by `--surface-1`); the catalog stores the **primary** var the serializer emits.
- **`productCard`:** mechanical. `productCardCustomProperty(key) = --product-card-${kebabCase(key)}`, with **one exception namespace** — the four aspect-ratio knobs map to `--aspect-product-card-*` instead. Catalog generates these via the helper, never hand-typed; a unit test asserts the generated var matches the documented var.

### Group: `colors`

| cluster | path | valueKind → control | cssVar | default | notes |
|---|---|---|---|---|---|
| base | `theme.colors.background` | color → ColorControl | `--color-background` | `#fefefe` | |
| base | `theme.colors.foreground` | color → ColorControl | `--color-foreground` | `#101418` | |
| accents | `theme.colors.accents[].type` | enum → (repeater) | `--color-accent-<type>` | (none) | `primary\|secondary` |
| accents | `theme.colors.accents[].color` | color → (repeater) | `--color-accent-<type>` | (none; falls back to `design.accents`) | |
| accents | `theme.colors.accents[].foreground` | color → (repeater) | `--color-accent-<type>-foreground` | (none) | |
| accents | `theme.colors.accentPrimaryLight` | color → ColorControl | `--color-accent-primary-light` | absent (`derived`) | reset CLEARS |
| accents | `theme.colors.accentPrimaryDark` | color → ColorControl | `--color-accent-primary-dark` | absent (`derived`) | reset CLEARS |
| accents | `theme.colors.accentSecondaryLight` | color → ColorControl | `--color-accent-secondary-light` | absent (`derived`) | reset CLEARS |
| accents | `theme.colors.accentSecondaryDark` | color → ColorControl | `--color-accent-secondary-dark` | absent (`derived`) | reset CLEARS |
| surface | `theme.colors.surface.base` | color → ColorControl | `--color-block` (alias `--surface-1`) | `#f3f3f3` | |
| surface | `theme.colors.surface.raised` | color → ColorControl | `--color-block-light` (`--surface-2`) | `#f5f5f5` | |
| surface | `theme.colors.surface.sunken` | color → ColorControl | `--color-block-dark` (`--surface-3`) | `#d8d8d8` | |
| text | `theme.colors.text.default` | color → ColorControl | `--color-dark` (alias `--text`) | `#222222` | |
| text | `theme.colors.text.muted` | color → ColorControl | `--color-dark-secondary` (`--text-muted`) | `#555555` | |
| border | `theme.colors.border.default` | color → ColorControl | `--border-default` | `#ece6d4` | **forthcoming** (no consumer until P5) |
| border | `theme.colors.border.strong` | color → ColorControl | `--border-strong` | `#d8d8d8` | **forthcoming** |
| state | `theme.colors.state.sale` | color → ColorControl | `--color-sale` (`--state-sale`) | `#b51200` | |
| state | `theme.colors.state.danger` | color → ColorControl | `--color-danger` (`--state-danger`) | `#a53d3a` | |
| state | `theme.colors.state.success` | color → ColorControl | `--color-block-success` (`--state-success`) | `#3b9e2e` | |
| state | `theme.colors.state.info` | color → ColorControl | `--color-block-info` (`--state-info`) | `#6dc0d5` | |
| focus | `theme.colors.focusRing` | color → ColorControl | `--focus-ring` | `var(--accent)` | **forthcoming**; color value is non-hex → text fallback |

### Group: `typography`

| cluster | path | valueKind → control | cssVar | default | notes |
|---|---|---|---|---|---|
| family | `theme.typography.fontFamily` | enum → SelectControl (font-preview) | `--font-primary` | `public-sans` | 13-font list (below) |
| family | `theme.typography.headingFamily` | enum → SelectControl (font-preview) | `--font-heading` | `public-sans` | emitted **only when ≠ body family** |
| weights | `theme.typography.fontWeights.normal` | number → NumberControl (100–900 step 100) | `--font-weight-normal` | `400` | |
| weights | `theme.typography.fontWeights.medium` | number → NumberControl | `--font-weight-medium` | `500` | |
| weights | `theme.typography.fontWeights.semibold` | number → NumberControl | `--font-weight-semibold` | `600` | |
| weights | `theme.typography.fontWeights.bold` | number → NumberControl | `--font-weight-bold` | `700` | |
| scale | `theme.typography.scale.xs` | dimension → DimensionControl | `--text-xs` | `0.75rem` | |
| scale | `theme.typography.scale.sm` | dimension → DimensionControl | `--text-sm` | `0.875rem` | |
| scale | `theme.typography.scale.base` | dimension → DimensionControl | `--text-base` | `1rem` | |
| scale | `theme.typography.scale.lg` | dimension → DimensionControl | `--text-lg` | `1.125rem` | |
| scale | `theme.typography.scale.xl` | dimension → DimensionControl | `--text-xl` | `1.25rem` | |

**Font list (13):** `public-sans` (Public Sans, platform default), `inter`, `roboto`, `open-sans`, `lato` (non-variable 400/700), `montserrat`, `poppins` (non-variable 400/700), `nunito`, `work-sans`, `source-serif-4`, `lora`, `playfair-display`, `merriweather`.

### Group: `radii`

| cluster | path | control | cssVar | default |
|---|---|---|---|---|
| radii | `theme.radii.block` | DimensionControl | `--block-border-radius` | `0.75rem` |
| radii | `theme.radii.blockLarge` | DimensionControl | `--block-border-radius-large` | `1rem` |
| radii | `theme.radii.blockSmall` | DimensionControl | `--block-border-radius-small` | `calc(var(--block-border-radius) * 0.75)` |
| radii | `theme.radii.blockTiny` | DimensionControl | `--block-border-radius-tiny` | `0.325rem` |

### Group: `spacing`

| cluster | path | control | cssVar | default |
|---|---|---|---|---|
| spacing | `theme.spacing.blockPadding` | DimensionControl | `--block-padding` | `0.6rem` |
| spacing | `theme.spacing.blockSpacer` | DimensionControl | `--block-spacer` | `0.55rem` |

### Group: `elevation`

| cluster | path | control | cssVar | default |
|---|---|---|---|---|
| elevation | `theme.elevation.card` | DimensionControl (shadow string) | `--product-card-shadow` | `0 1px 0 rgb(20 17 11 / 2%), 0 1px 2px rgb(20 17 11 / 4%)` |
| elevation | `theme.elevation.cardHover` | DimensionControl | `--product-card-shadow-hover` | `0 1px 0 rgb(20 17 11 / 2%), 0 10px 24px -12px rgb(20 17 11 / 22%)` |
| elevation | `theme.elevation.panel` | DimensionControl | `--header-panel-shadow` | `0 24px 60px -24px rgb(15 23 42 / 0.18), 0 8px 20px -8px rgb(15 23 42 / 0.08)` |

### Group: `productCard` (13 clusters, 94 knobs; `(L)` = LEGACY/deprecated)

> Mechanical var rule: `--product-card-${kebabCase(key)}`; aspect knobs → `--aspect-product-card-*`. Quoted knobs noted.

**chassis (12):** `bg` color `#ffffff` · `borderColor` color `#ece6d4` · `borderWidth` dim `1px` · `radius`(L) dim `12px` · `padding`(L) dim `10px` · `gap`(L) dim `8px` · `shadow` dim (= elevation.card default) · `shadowHover` dim (= elevation.cardHover default) · `minWidth` dim `200px` · `maxWidth` dim `240px` · `gridAlign` enum `start` (`start\|center\|end\|stretch`) · `searchImageWidth` dim `72px`

**image (9):** `imageRadius`(L) dim `8px` · `imagePadding`(L) dim `12px` · `imageFit` enum `cover` (`cover\|contain`) · `imageHoverSwap` enum `on` (`on\|off`) · `imageSizes` dim **quoted** `(max-width: 768px) 50vw, 240px` · `aspectVertical` dim `4 / 5` → `--aspect-product-card-vertical` · `aspectHorizontal` dim `4 / 5` → `--aspect-product-card-horizontal` · `aspectHorizontalSquare`(L) dim `1 / 1` → `--aspect-product-card-horizontal-square` · `aspectMicro`(L) dim `1 / 1` → `--aspect-product-card-micro`

**vendor (3):** `vendorColor` color `#6b6555` · `vendorSize`(L) dim `11px` · `eyebrowTracking` dim `0.14em`

**title (4):** `titleColor` color `#14110b` · `titleSize`(L) dim `14px` · `titleWeight`(L) number `600` · `titleLineClamp` number `2`

**price (6):** `priceColor` color `#14110b` · `priceSize`(L) dim `15px` · `priceWeight`(L) number `700` · `compareColor` color `#6b6555` · `urgencyColor` color `#b54a2a` · `urgencyThreshold` number `5`

**swatch (4):** `swatchSize` dim `18px` · `swatchGap` dim `5px` · `swatchRingColor` color `#14110b` · `swatchHitPadding` dim `6px`

**chip (7):** `chipBg` color `#ffffff` · `chipColor` color `#14110b` · `chipBorder` color `#ece6d4` · `chipActiveBg` color `#14110b` · `chipActiveColor` color `#ffffff` · `chipPaddingY`(L) dim `6px` · `chipPaddingX`(L) dim `10px`

**more (5):** `moreBg` color `#f3eedc` · `moreColor` color `#4a463b` · `moreSize`(L) dim `11px` · `moreWeight`(L) number `600` · `moreMinSize`(L) dim `24px`

**cta (14):** `ctaBg` color `#14110b` · `ctaColor` color `#ffffff` · `ctaRadius`(L) dim `8px` · `ctaPaddingY`(L) dim `11px` · `ctaHeight` dim `36px` · `ctaPlacement` enum `float-pill` (`float-pill\|inline`) · `ctaPillPosition` enum `top-right` (`top-right\|top-left\|bottom-right\|bottom-left`) · `ctaPillLabel` dim **quoted** `(empty)` · `ctaPillIcon` dim **quoted** `+` · `ctaPillReveal` enum `always` (`always\|hover`) · `ctaInlineStyle` enum `solid` (`solid\|outline`) · `fastPathDot` color `#2f7d4a` · `fastPathSingleVariant` enum `on` (`on\|off`) · `quickAddPresentation` enum `auto` (**single-option** → read-only)

**overlay (7, ALL LEGACY — primitive deleted in Phase 3):** `overlayBg`(L) color `#ffffff` · `overlayRadius`(L) dim `12px` · `overlayBorderColor`(L) color `#ece6d4` · `overlayShadow`(L) dim `0 12px 32px -8px rgb(20 17 11 / 25%)` · `overlayWidth`(L) dim `260px` · `overlayMaxHeight`(L) dim `320px` · `overlayPadding`(L) dim `14px`

**oos (2):** `oosOpacity` number `0.7` (0–1 step 0.05) · `oosImageSaturate` number `0.85` (0–1 step 0.05)

**motion (10):** `motionEase` dim `cubic-bezier(0.2, 0.8, 0.2, 1)` · `motionFast` dim `80ms` · `motionBase` dim `160ms` · `motionPickerIn` dim `220ms` · `motionPickerOut` dim `180ms` · `motionHoverDuration`(L) dim `200ms` · `motionHoverEase`(L) dim `cubic-bezier(0.2, 0.8, 0.2, 1)` · `motionImageSwapDuration`(L) dim `400ms` · `motionOverlayInDuration`(L) dim `180ms` · `motionOverlayInEase`(L) dim `cubic-bezier(0.32, 0.72, 0, 1)`

**sale (11):** `saleStyle` enum `strike-only` (**single-option** → read-only) · `saleStrikeColor` color `currentColor` (non-hex → text fallback) · `saleStrikeAngle` dim `-8deg` · `saleStrikeExtend` dim `2px` · `saleCurrentColor` color `#b54a2a` · `saleShowSavingsLine` enum `off` (`on\|off`) · `saleBadgeStyle` enum `default` (**single-option** → read-only) · `saleBadgePosition` enum `top-left` (`top-left\|top-right\|bottom-left\|bottom-right`) · `saleBadgeText` dim **quoted** `−{n}%` (`{n}` token interpolated at runtime; helper hint in UI) · `saleBadgeMinDiscount` number `11` · `saleBadgeAllowOverlap` **boolean** `false` (payloadType `checkbox`)

### Group: `sections` (data-driven, separate persistence path — see §6)
Section-enablement flags live on `shops.featureFlags` (relationship array), keyed `section:<id>` via `sectionFlagKey(id)`, recognized by `isSectionFlagKey`. No concrete ids are hardcoded — ids are per-shop data. `FeatureFlagKind` is `'section'` (vs the default `'behavior'`). **Scoped as a follow-up phase** (Phase 7); the token editor ships without it.

### Catalog totals
colors 21 · typography 11 · radii 4 · spacing 2 · elevation 3 · productCard 94 = **135 token rows** (94 product-card knobs; ~40 of them LEGACY/deprecated, 7 overlay deleted in Phase 3; 3 forthcoming: `border.default`, `border.strong`, `focusRing`; 4 derived: accent light/dark).

---

## 3. valueKind → control mapping

| valueKind | control | behavior |
|---|---|---|
| `color` | **ColorControl** (new) | native `<input type="color">` swatch + hex/CSS text input, two-way synced. Text field accepts non-hex CSS color tokens (`var(--accent)`, `currentColor`); swatch goes neutral/disabled when value isn't a parseable hex. Validate with `colord`. Writes the **raw string**. |
| `dimension` | **DimensionControl** (new) | text Input (rem/px/%/aspect like `4 / 5`/shadow lists/durations). **Quoted** knobs (`imageSizes`, `ctaPillLabel`, `ctaPillIcon`, `saleBadgeText`) are plain text — the serializer adds CSS quotes on emit; the stored value stays unquoted. `saleBadgeText` shows a `{n}` helper hint. |
| `number` | **NumberControl** (new) | numeric input with min/max/step from catalog metadata (weights 100–900 step 100; opacities 0–1 step 0.05). |
| `enum` | **SelectControl** (new, Radix Select) | options from `enumValues`. `fontFamily`/`headingFamily` render each option in its own typeface (font-preview override). **Single-option** enums (`quickAddPresentation`, `saleStyle`, `saleBadgeStyle`) render as a disabled/read-only select. |
| `boolean` | **SwitchControl** (new, Radix Switch) | only `saleBadgeAllowOverlap` today. |

**Cross-cutting per-row affordances (catalog-driven):**
- **Reset to default:** `setValue(THEME_DEFAULTS@path)`. For `derived` tokens (accent light/dark), reset **clears** via `setValue(undefined)` so the storefront keeps deriving via `colord`.
- **Badges:** `deprecated` → "Deprecated" pill; `forthcoming` → "No effect yet" pill. LEGACY clusters collapse behind an **Advanced** disclosure.
- **Accents** is a bespoke repeater (`accents[]` is an indexed array of `{type,color,foreground}`, not a leaf) plus the four optional light/dark override fields shown as "auto (derived)" placeholders until overridden.

---

## 4. Navigation Model

**Route:** new sibling `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/theme/page.tsx` (mirrors `settings/shop/page.tsx`: same `EditorEditPage` host, same `shopsSaveDraft`/`shopsPublish` generated actions bound to `(domain, id, locale)`). Keeping Theme off the shop route avoids two editors writing the same `theme.*` paths — the shop route's auto-render **omits** the theme group (see §5).

**Subnav:** add an **admin-only** `NavItem href={\`${base}/theme/\`}` label "Theme" in `@subnav/settings/default.tsx` alongside the existing Shop item.

**Shell:** three-pane customizer (graft from three-pane approach):
- **Left rail** — top-level groups derived from catalog `group` (Colors, Typography, Layout = radii+spacing+elevation, Product Card, Sections[Phase 7]). Selecting a group reveals its clusters as accordion sections. Each cluster header shows a **knob count** and deprecated/forthcoming **pills**. Product Card's 13 clusters render as collapsible accordion panels (collapsed by default).
- **Center pane** — sticky, full-height `LivePreviewIframe` with a **desktop/mobile viewport toggle** and the existing manual Refresh as a fallback.
- **Right/inline** — the active cluster's field rows (`<TokenControl>` per token).
- **`?cluster=` search param** deep-links the active cluster so nav state survives reload.

Nav is generated entirely from `deriveCatalog()` → `Map<group, Map<cluster, ThemeTokenMeta[]>>` preserving declaration order. **No token names are typed in components.**

---

## 5. Persistence Contract

- The Theme Editor is a `'use client'` surface mounted **inside Payload's `<Form>`** (provided by `DocumentFormBody` at `document-form-body.tsx:37`, under `PayloadFieldShell` → `RootProvider` at `payload-field-shell.tsx:56`).
- Each control calls `useField({ path: token.path })` → `{ value, setValue, showError }` and writes at the **exact persisted dotted path**. Values flow into `Form.getData()` and out through `_payload` serialization.
- **Save path:** toolbar → `boundSaveDraft`/`boundPublish` (`editor-edit-page.tsx:145-152`) → generated `shopsSaveDraft` (single `_payload` FormData key) → `parseFormPayload` + `pickByFieldNames` (top-level scrub only; `theme` is a top-level named group at `shops.ts:85`, so the whole `theme.*` subtree — including the collapsible-wrapped `theme.productCard.*`, which adds **no** data path — passes through intact) → `payload.update` with locale.
- **Accents array** writes to indexed paths `theme.colors.accents.0.type` etc.; add/remove rows use `useForm().dispatchFields` + `setModified(true)`.
- **Dirty state** reuses Payload's `useFormModified()` (already the `InitialStateGate` gate in `document-form-body.tsx:64`) — no custom store.
- **Hard constraint:** do **NOT** add `theme` to `isHiddenEditorField` (`hidden-fields.ts:74`). Instead the shop route's `EditorFields` gets an `omitPaths` prop to drop the theme group from its auto-render, so the theme group is owned by **exactly one** editor while `FormState` stays intact for `useField`/save.
- Server-action props crossing the client boundary keep the `Action` suffix (`saveDraftAction`) per the Next 16 lint rule.

---

## 6. Live-Preview Behavior

Hybrid: instant token streaming over `postMessage`; `draftMode` reserved for draft **content**.

1. **Shared serializer** — `serializeThemeToCssVars(theme: ResolvedShopTheme, branding: {primary,secondary}|null): Array<[cssVar,value]>` extracted into `packages/db/src/lib/theme.ts` beside `resolveTheme`/`THEME_DEFAULTS` (lifting the inline block `css-variables.tsx:316-435` plus `serializeProductCardTokens:185`, `appendOverriddenTokens:218` diff-from-default, `appendTokens:246`, `sanitizeCssValue:160`). **No `server-only` import.** `CssVariablesProvider` becomes a thin server wrapper rendering `<style>` from this output — behavior **byte-identical** (diff-from-default, sanitize, null-when-no-override, accent fan-out + `colord` light/dark derivation, `--font-heading` only when ≠ body).
2. **Admin → iframe** — render `LivePreviewIframe` (today unwired) in the `livePreview` slot with `previewUrl` from `buildLivePreviewUrl` (`payload.config.ts:39`, secret never crosses RSC). A `useThemePreview` hook subscribes to `theme.*` via `useFormFields`, un-flattens dotted paths into a `ResolvedShopTheme` shape, runs `resolveTheme` + `serializeThemeToCssVars`, and **debounced (~120ms)** posts `{ type: 'theme-preview', vars }` to `iframe.contentWindow` with `targetOrigin = STOREFRONT_BASE_URL`.
3. **Handshake** (graft) — `LivePreviewIframe` exposes a load/ready callback; the storefront bridge posts a `theme-preview-ready` message on mount, and the admin holds the first `postMessage` until ready, so the first edit isn't dropped before the iframe mounts.
4. **Storefront listener** — a `'use client'` `PreviewThemeBridge`, mounted **only** under the preview/draft cookie (set by `cms-preview/route.ts:47`), `addEventListener('message')`, verifies `event.origin` against the admin origin, and applies each `[name,value]` via `document.documentElement.style.setProperty`, overriding the SSR `<style>`. **On reset** the admin sends a remove instruction → bridge calls `removeProperty` (graft) so derived accent light/dark and `focusRing: var(--accent)` keep tracking runtime derivation rather than getting pinned.

Manual Refresh stays as the fallback and is the path for previewing structural/content changes via `draftMode`.

---

## 7. Constraints & Risks

- **Byte-for-byte serializer parity** — snapshot-test `CssVariablesProvider` output **before** extracting; SSR vs preview must not diverge.
- **`postMessage` security** — pin `targetOrigin = STOREFRONT_BASE_URL`; verify `event.origin` against the admin origin both directions; gate the storefront listener strictly on the preview cookie. The serializer's `sanitizeCssValue` already guards values.
- **Reset must clear, not pin** derived tokens (`removeProperty`).
- **Inert/forthcoming tokens** (`border.default/strong`, `focusRing`) are visual no-ops until P5 → badge "No effect yet" or merchants think preview is broken.
- **LEGACY ~40 knobs** (deleted in product-card-redesign Phase 3) → Advanced disclosure + deprecated pill; catalog flags must track the Phase-3 removal.
- **Quoted/content knobs** must stay free-text; a select/number control would corrupt `saleBadgeText {n}`, `ctaPillIcon`, etc.
- **`EditorEditPage`/`EditorFields` are shared `packages/cms`** — threading `omitPaths` (and keeping `<EditorFields>` default intact) must not regress shop/tenants/users routes; **needs a changeset** (`packages/cms` not ignored).
- **Un-flatten** dotted `theme.*` paths back into `ResolvedShopTheme` must handle the `accents[]` indexed array and `noUncheckedIndexedAccess` undefined leaves.
- **Accents precedence** — `resolveTheme` prefers `theme.colors.accents` when non-empty, else `design.accents`; the editor writes `theme.colors.accents` and must surface the precedence.
- **Sections (Phase 7)** depends on `shops.featureFlags` rows existing/being creatable; ids are data-driven — needs a known-id source or free-add.

---

## 8. Acceptance Criteria

1. Visiting `…/[domain]/settings/theme/` (admin-only) renders the three-pane Theme Editor; the "Theme" NavItem appears in settings subnav for admins only.
2. Left rail and clusters are generated 100% from `THEME_TOKEN_CATALOG`; no token name is hardcoded in any component. `?cluster=` deep-links and survives reload.
3. Every catalog token renders the correct control per its `valueKind`; single-option enums are read-only; quoted knobs are free-text; deprecated knobs sit behind Advanced with a pill; forthcoming/derived tokens are badged.
4. Editing any control writes its persisted dotted path; **Save draft** and **Publish** persist the full `theme.*` subtree with **no action/route changes**, verified by a round-trip (edit → save → reload shows the value).
5. `buildCmsFormState` still contains all `theme.*` paths (regression test) — `theme` is **not** in `isHiddenEditorField`. The shop route no longer auto-renders the theme group (`omitPaths`).
6. Editing a token streams a `postMessage` that updates the iframe's `documentElement` style **instantly, with no save and no reload**; reset sends `removeProperty` and derived tokens resume runtime derivation.
7. `serializeThemeToCssVars` is pure/isomorphic (no `server-only`) and `CssVariablesProvider`'s emitted `<style>` is **byte-identical** to pre-refactor (snapshot test green).
8. CI bijection test passes: every `THEME_DEFAULTS` leaf ↔ exactly one catalog row, both directions; productCard `cssVar`s match `productCardCustomProperty`; every catalog `cssVar` is emitted by the serializer for a non-default override.
9. `pnpm lint`, `pnpm typecheck`, `pnpm test` green; LSP diagnostics clean; changesets present for `packages/cms`/`packages/db` and a storefront/admin changeset if their public surface changed.

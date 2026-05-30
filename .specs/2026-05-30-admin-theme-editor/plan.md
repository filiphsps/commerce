# Theme Editor + Live Storefront Preview — Build Plan

**Path:** `.specs/2026-05-30-theme-editor/plan.md`
**Prereq:** fresh checkout → run `pnpm build:packages` before any lint/typecheck/test (apps import workspace packages from built `dist/`).

Phases are ordered by dependency. Phase 1 (the catalog) is the keystone — everything else consumes it. Each task lists exact files, the seam it plugs into, and how it's verified.

---

## Phase 0 — Snapshot guard (do FIRST, before touching the serializer)

**0.1 — Lock current CSS-var output.**
- **Files:** `apps/storefront/src/utils/__tests__/css-variables.test.tsx` (new or extend).
- **Seam:** `CssVariablesProvider` (`css-variables.tsx:299`), emit block `:316-449`.
- **Do:** Render `CssVariablesProvider` for a representative shop (defaults + a handful of overrides spanning structured groups, productCard mechanical vars, quoted knobs, accents with derived light/dark, `--font-heading` differ case). Snapshot the emitted `<style>` text.
- **Verify:** `pnpm test --project @nordcom/commerce-storefront` green. This snapshot must stay byte-identical through Phase 5.

---

## Phase 1 — The token-metadata catalog (KEYSTONE)

**1.1 — Create the catalog module.**
- **Files (new):** `packages/db/src/lib/theme-catalog.ts`; export from `packages/db/src/index.ts` (or the lib barrel).
- **Seam:** colocated with `resolveTheme`/`THEME_DEFAULTS` in `packages/db/src/lib/theme.ts` so it physically cannot import `server-only` and cannot drift to another package.
- **Do:** Define `ValueKind`, `ThemeTokenMeta` (shape per spec §2 — **no `default` field**), `productCardCustomProperty(key)` helper (`--product-card-${kebabCase(key)}` with the `--aspect-product-card-*` exception namespace; export `kebabCase` if not already), and `THEME_TOKEN_CATALOG` covering all 135 rows from spec §2. Structured-group `cssVar`s hand-authored from the `ResolvedShopTheme` JSDoc; productCard `cssVar`s generated via `productCardCustomProperty`. Mark `deprecated`/`forthcoming`/`derived`/`quoted`/single-option enums per the tables. Add `deriveCatalog(): Map<group, Map<cluster, ThemeTokenMeta[]>>` preserving declaration order.
- **Add** a `satisfies`/type-level assertion that catalog `path`s are valid `ResolvedShopTheme` key paths.
- **Verify:** `pnpm typecheck`. Defer runtime parity to 1.2.

**1.2 — Parity + drift CI gate.**
- **Files (new):** `packages/db/src/lib/__tests__/theme-catalog.test.ts`.
- **Do:** (a) Recursively flatten `THEME_DEFAULTS` to leaf paths; assert a **bijection** with catalog `path`s (every leaf ↔ exactly one row, both directions; account for the `accents[]` array shape). (b) For every productCard row, assert `cssVar === productCardCustomProperty(key)`. (c) Assert defaults are deep-gettable from `THEME_DEFAULTS` at each `path` (no duplicated values in catalog).
- **Verify:** `pnpm test --project @nordcom/commerce-db`.

**1.3 — Changeset (db).**
- **Files (new):** `.changeset/*.md` — `@nordcom/commerce-db` **minor** (additive catalog + later serializer export). Summary: WHY only.

---

## Phase 2 — Extract the pure serializer

**2.1 — Add `serializeThemeToCssVars` to `theme.ts`.**
- **Files (modify):** `packages/db/src/lib/theme.ts`.
- **Seam:** lift the inline serialization from `css-variables.tsx:316-435` + `serializeProductCardTokens:185` + `appendOverriddenTokens:218` (diff-from-default) + `appendTokens:246` + `sanitizeCssValue:160`.
- **Do:** Export `serializeThemeToCssVars(theme: ResolvedShopTheme, branding: {primary,secondary}|null): Array<[cssVar,value]>`. Isomorphic, **no `server-only`**. Preserve: diff-from-default keyed off `THEME_DEFAULTS`, `sanitizeCssValue`, quoted-content wrapping, accent fan-out + `colord`-derived light/dark, `--font-heading` only when ≠ body, null/empty when no override differs. Use `productCardCustomProperty` from the catalog module for the mechanical rule.
- **Verify:** `pnpm typecheck`; add a unit test asserting every catalog `cssVar` is emitted for a non-default override of that token.

**2.2 — Refactor `CssVariablesProvider` to consume it.**
- **Files (modify):** `apps/storefront/src/utils/css-variables.tsx`.
- **Do:** Keep the I/O wrapper (shop load, `getBrandingColors`, `resolveTheme`); render `<style>` from `serializeThemeToCssVars(...)` output. Remove the now-duplicated inline helpers.
- **Verify:** **Phase 0.1 snapshot must stay byte-identical.** `pnpm test --project @nordcom/commerce-storefront`. If snapshot diffs, the extraction is wrong — fix the serializer, do not update the snapshot.

---

## Phase 3 — Control primitives (admin UI)

> House style: thin Radix wrappers + `cn()` (`@/utils/tailwind`), `'use client'`, JSDoc per prop, 4-space/single-quote/semicolons (Biome), forward refs + `...props`. Follow `components/ui/dropdown-menu.tsx`/`tooltip.tsx` patterns.

**3.1 — Add Radix deps.**
- **Files (modify):** `apps/admin/package.json` — add `@radix-ui/react-select`, `@radix-ui/react-accordion`, `@radix-ui/react-switch`. (Tabs can use Nordstar `Details` or a vertical accordion to avoid an extra dep — prefer reusing accordion for the left rail.)
- **Verify:** `pnpm install`; `pnpm build:packages` unaffected.

**3.2 — Build primitives.**
- **Files (new):**
  - `apps/admin/src/components/ui/color-field.tsx` — native `<input type="color">` swatch + hex/CSS text input (two-way), `colord` validation, neutral swatch when value isn't parseable hex (handles `var()`/`currentColor`).
  - `apps/admin/src/components/ui/select.tsx` — Radix Select wrapper.
  - `apps/admin/src/components/ui/switch.tsx` — Radix Switch wrapper.
  - `apps/admin/src/components/ui/accordion.tsx` — Radix Accordion wrapper (left-rail group/cluster nav + product-card clusters).
- **Verify:** `pnpm lint`; LSP diagnostics clean. (No form wiring yet — render in isolation.)

---

## Phase 4 — Editor surface + nav (catalog-driven, inside `<Form>`)

**4.1 — Thread a field-surface seam through shared CMS package.**
- **Files (modify):** `packages/cms/src/editor/ui/editor-edit-page.tsx`, `packages/cms/src/editor/ui/editor-fields.tsx`.
- **Seam:** `EditorEditPage` already renders `<EditorFields>` as the `<DocumentForm>` child (`:187`) and accepts `livePreview?: ReactNode` (`:41`, rendered `:185`).
- **Do:** Add an optional `fieldSurface?: ReactNode` prop to `EditorEditPage` (default stays `<EditorFields collection=…/>`). Add an `omitPaths?: string[]` prop to `EditorFields` that filters the named groups out of the **render** list only (NOT `isHiddenEditorField` — `FormState` must stay intact). The theme route passes `fieldSurface={<ThemeEditor/>}`; the shop route passes `omitPaths={['theme']}`.
- **Verify:** shop/tenants/users routes still render unchanged; `pnpm typecheck`. **Changeset:** `@nordcom/commerce-cms` **minor**. If any manifest changes, run `pnpm cms:gen` and gate with `pnpm cms:gen:check` (none expected here).

**4.2 — The theme route.**
- **Files (new):** `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/theme/page.tsx` (mirror `settings/shop/page.tsx:25-38`: fetch shop doc via `EditorEditPage`, bind generated `shopsSaveDraft`/`shopsPublish`). Pass `fieldSurface={<ThemeEditor/>}` and `livePreview={<LivePreviewIframe …/> + <PreviewBridge/>}` (wired in Phase 6).
- **Files (modify):** `apps/admin/src/app/(app)/(dashboard)/[domain]/@subnav/settings/default.tsx` — add admin-only `NavItem href={\`${base}/theme/\`}` label "Theme".
- **Verify:** route renders; nav item visible to admins only.

**4.3 — Editor shell + control router.**
- **Files (new):**
  - `apps/admin/src/components/theme-editor/theme-editor.tsx` (`'use client'`) — three-pane shell: left-rail group/cluster nav from `deriveCatalog()`, `?cluster=` deep-link, viewport toggle for the iframe, cluster headers with knob count + deprecated/forthcoming pills, LEGACY behind an Advanced disclosure.
  - `apps/admin/src/components/theme-editor/token-control.tsx` — dispatcher: resolve catalog entry through the control registry.
  - `apps/admin/src/components/theme-editor/control-registry.tsx` — `Record<ValueKind, Control>` + per-path overrides (font-preview select; accent repeater).
  - `apps/admin/src/components/theme-editor/controls/{color-control,dimension-control,number-control,select-control,switch-control,field-row}.tsx`.
  - `apps/admin/src/components/theme-editor/accent-repeater.tsx` — `theme.colors.accents[]` add/remove rows.
  - `apps/admin/src/components/theme-editor/unflatten-theme.ts` — dotted `theme.*` → `ResolvedShopTheme` shape (handles `accents[]`, `noUncheckedIndexedAccess` undefined leaves).
- **Verify:** controls render per token; nav generated from catalog; no hardcoded token names. `pnpm lint` + LSP clean.

---

## Phase 5 — Form-state wiring

**5.1 — `useField` integration.**
- **Files (modify):** the `controls/*` and `accent-repeater.tsx` from 4.3.
- **Seam:** `<Form>` provided by `DocumentFormBody` (`:37`) under `PayloadFieldShell` (`:56`). `ThemeEditor` renders as `fieldSurface`, i.e. inside `<Form>`.
- **Do:** Each leaf control calls `useField({ path: token.path })` → `{ value, setValue, showError }`, writes the raw string/number/bool. Reset-to-default: `setValue(deepGet(THEME_DEFAULTS, path))`; for `derived` tokens `setValue(undefined)`. Accent repeater uses `useForm().dispatchFields` + `setModified(true)` for add/remove rows. Defaults shown as placeholders via deep-get.
- **Verify (round-trip):** edit `theme.productCard.padding` + `theme.colors.background` → Save draft → reload → values persist. Confirm `boundSaveDraft`/`pickByFieldNames` pass the whole `theme.*` subtree (no action changes).

**5.2 — Regression: theme stays in FormState.**
- **Files (new):** test under `apps/admin/src/lib/__tests__/` (or `packages/cms`) asserting `buildCmsFormState` output still contains `theme.*` paths and `isHiddenEditorField` does **not** match the theme group.
- **Verify:** `pnpm test`.

---

## Phase 6 — Live-preview wiring (admin side)

**6.1 — Expose iframe + handshake on `LivePreviewIframe`.**
- **Files (modify):** `apps/admin/src/components/cms/live-preview-iframe.tsx`.
- **Seam:** today `iframeRef` is private (`:83`) and only `handleRefresh` is exposed.
- **Do:** Add an optional `onIframeReady?(win: Window)` callback / forward the iframe element, fired after the storefront posts `theme-preview-ready`. Keep the manual-refresh path and existing test green; new callback is optional/additive.
- **Verify:** existing `live-preview-iframe` test stays green.

**6.2 — Preview bridge hook + component.**
- **Files (new):**
  - `apps/admin/src/components/theme-editor/use-theme-preview.ts` — subscribe `theme.*` via `useFormFields`, `unflatten-theme` → `ResolvedShopTheme`, run `resolveTheme` + `serializeThemeToCssVars(theme, brandingFromAccents)`, **debounced ~120ms** `postMessage({type:'theme-preview', vars}, STOREFRONT_BASE_URL)` to `iframe.contentWindow`. Hold the first post until `onIframeReady`. On reset, post a remove instruction (var names to clear).
  - `apps/admin/src/components/theme-editor/preview-bridge.tsx` (`'use client'`) — mounts the iframe + hook in the `livePreview` slot.
- **Files (modify):** `apps/admin/src/payload.config.ts` — export `buildLivePreviewUrl` (`:39`) for server-side `previewUrl` assembly (secret never crosses RSC).
- **Verify:** editing a control posts a message; no message before iframe ready.

---

## Phase 7 — Storefront preview seam

**7.1 — `PreviewThemeBridge` listener.**
- **Files (new):** `apps/storefront/src/app/[domain]/[locale]/preview-theme-bridge.tsx` (`'use client'`).
- **Do:** `addEventListener('message')`, verify `event.origin` against the admin origin, on `{type:'theme-preview', vars}` apply each `[name,value]` via `document.documentElement.style.setProperty`; on the remove instruction call `removeProperty(name)` so derived accent light/dark and `focusRing: var(--accent)` resume runtime derivation. Post `theme-preview-ready` to the parent on mount.
- **Files (modify):** `apps/storefront/src/app/[domain]/[locale]/layout.tsx` — mount it **only** when the preview/draft cookie (set by `cms-preview/route.ts:47`) is present.
- **Verify:** with draftMode/preview on, admin edits update the storefront `documentElement` live; reset clears the override.

**7.2 — Changeset (storefront/admin if public surface changed).**
- **Files (new):** `.changeset/*.md` — storefront/admin **patch** if those packages aren't in the ignore list and their behavior changed (check `.changeset/config.json`). Admin app may be ignored; verify.

---

## Phase 8 — Sections tab (FOLLOW-UP, can ship after the token editor)

- **Files (new):** `apps/admin/src/components/theme-editor/sections-panel.tsx` — data-driven `section:<id>` toggles over `shops.featureFlags` (key via `sectionFlagKey`, recognized by `isSectionFlagKey`; `FeatureFlagKind='section'`). Needs a source of known section ids (or free-add) since none are hardcoded; toggling may require creating `featureFlags` docs.
- **Scope:** explicitly deferred; not required for the token editor's acceptance criteria.

---

## Phase 9 — Verification gate (before claiming done)

- `pnpm build:packages` (fresh) then `pnpm lint`, `pnpm typecheck`, `pnpm test` — all green.
- Phase 0 snapshot byte-identical; Phase 1.2 bijection + serializer-coverage tests green; Phase 5.2 FormState regression green; `live-preview-iframe` test green.
- LSP diagnostics clean on every new/edited file.
- Changesets present: `@nordcom/commerce-db` (minor), `@nordcom/commerce-cms` (minor), storefront/admin (patch, if not ignored).
- `pnpm cms:gen:check` if any manifest touched (none expected).
- Manual `pnpm dev` smoke: open `…/settings/theme/`, edit a color → instant iframe update with no save; reset → derived var resumes; Save draft → reload persists.

---

## Dependency summary
Phase 1 (catalog) blocks everything. Phase 0 must precede Phase 2 (snapshot guard). Phase 2 (serializer) blocks Phase 6/7 (preview). Phase 3 (primitives) blocks Phase 4 (editor UI). Phase 4 blocks Phase 5 (form wiring). Phases 6+7 are the preview pipeline (admin → storefront). Phase 8 is independent follow-up.

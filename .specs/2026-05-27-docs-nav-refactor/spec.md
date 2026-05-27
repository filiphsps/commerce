# Docs nav refactor — spec

**Date:** 2026-05-27
**Slug:** `2026-05-27-docs-nav-refactor`
**Scope:** `apps/docs` (and supporting changes in workspace `docs/` directories)

## Summary

Replace the current Nextra-based docs site with a Fumadocs-based site that ships four sidebar-tab sections — **Docs**, **Packages**, **Reference**, **Errors** — visually aligned with the Nordstar design system already used by `apps/admin` and `apps/landing`. The Reference tab is auto-generated from TypeDoc JSON + JSDoc with per-symbol pages for functions/classes/components. Authored MDX lives in the Packages tab; the Reference tab is purely generated and cross-links back to Packages. Search is built-in via Fumadocs' static Orama integration.

Today the docs are organized as a flat workspaces list under one `(generated)` menu, mixing 3 apps and 11 packages with no category hierarchy and no per-symbol detail. This spec lands clear-on-arrival information architecture, a richer reference render that surfaces JSDoc, a coherent visual identity, and a build pipeline that scales as JSDoc coverage grows.

## Goals

- Group docs by category (workspace role) and by purpose (narrative vs reference vs error catalog) instead of one flat list.
- Render JSDoc fully — `@param`, `@returns`, `@throws`, `@example`, `@see`, `@deprecated`, `@beta`, `@experimental`, `@internal` — on per-symbol pages for functions, classes, and React components.
- Resolve `{@link X}` references across all four tabs at build time; auto-link bare inline-code identifiers in authored MDX.
- Inherit the Nordstar visual identity already shipping in `apps/admin` and `apps/landing` — pure black canvas, magenta brand, 3px borders, Montserrat + Geist Mono.
- Preserve existing external behaviors: trailing slashes, `output: 'export'`, the `commerce-errors` stable help URL pattern `/docs/errors/<code>/`, GitHub-Pages-compatible `basePath`.
- Provide redirects so existing inbound links don't 404.

## Non-goals

- Versioned documentation (single-version, master only).
- i18n (English-only).
- An API playground or interactive code sandbox.
- A separate Cookbook / Recipes tab (could come in a follow-up once authored content exists).
- Rewriting the e2e test suite — that is being reworked separately and is explicitly out of scope here.

## Information architecture

### Four sidebar tabs at site root

Each tab is a Fumadocs root folder (`meta.json: { root: true, title, icon? }`). The active tab pill is always brand magenta — per-tab neons (lime / cyan / amber) appear only as semantic tokens elsewhere.

| Tab | URL prefix | Purpose | Content source |
|---|---|---|---|
| **Docs** | `/docs/` *(unprefixed default)* | Platform concepts, getting started, app narratives, ops | Authored MDX in `apps/docs/content/docs/` |
| **Packages** | `/docs/packages/` | Per-workspace narrative MDX, grouped by category | Mirrored from `apps/<x>/docs/` and `packages/<x>/docs/` |
| **Reference** | `/docs/reference/` | Generated symbol catalog from TypeDoc + JSDoc | Generated MDX from `.typedoc-out/*.json` |
| **Errors** | `/docs/errors/` | Stable error-code catalog | Ported from `apps/landing/docs/errors/*.mdx` (Markdoc → MDX) |

**URL discipline.** Docs is the unprefixed default (no `/docs/docs/` collision). The `commerce-errors` `help` URL pattern (`/docs/errors/<code>/`) works without redirects. Trailing slashes preserved.

### Per-tab sidebar structure

**Docs tab** — linear, narrative-first:

```
Get started      · Introduction · Quickstart · Architecture
Concepts         · Multi-tenancy · Locales · Caching · CMS & content · Errors
Apps             · Storefront · Admin · Landing            (full docs mirrored here)
Operations       · Deployment · Contributing · Conventions · TypeScript project structure
```

**Packages tab** — grouped by role; apps are cross-listed as external-link sidebar entries (no underlying MDX) that jump to `Docs › Apps › <slug>`:

```
Applications     · storefront ↗ · admin ↗ · landing ↗      (Fumadocs external meta items)
Core             · cms · db · errors · marketing-common
Shopify          · shopify-graphql · shopify-html
TagTree          · tagtree/core · tagtree/next · tagtree/payload · tagtree/shopify
UI               · react-payment-brand-icons
```

Each package node expands to its mirrored MDX subtree (Overview / Blocks / Editor / …) plus a `Changelog` leaf when `CHANGELOG.md` exists. Apps have no Changelog leaf.

**Reference tab** — by package → subpath → symbol:

```
cms
  /api        (overview: symbol table + back-link to Packages › cms)
    getArticle, listArticles, …         (per-symbol pages for fn/class/component)
  /cache, /blocks, /blocks/render, /config, /collections
db, errors, marketing-common, …
```

Subpath URLs nest naturally: `./blocks/render` → `/docs/reference/cms/blocks/render/`. Within a subpath, the overview page renders the autogen symbol table; functions/classes/components get individual pages; types/interfaces/variables/enums stay inline on the overview.

**Errors tab** — grouped by code prefix with hand-curated overrides:

```
API_*       11 codes
INVALID_*    3 codes
General      NOT_FOUND, UNREACHABLE, GENERIC_TODO     (override map)
```

## Content sources and generation pipeline

`apps/docs/package.json scripts.pre` runs the following ordered steps. Steps 1, 2, 6 already exist (retargeted); 3, 4, 5 are new.

```
pnpm gen:
  1. gen:typedoc        → .typedoc-out/<slug>/<subpath>.json     (existing — keep)
  2. gen:mirror         → content/packages/<slug>/*.mdx          (retarget; mirror script writes to content/packages/)
  3. gen:reference      → content/reference/<slug>/<subpath>/{index,<symbol>}.mdx  (new)
  4. gen:errors         → content/errors/*.mdx (Markdoc → MDX)   (new, one-time + watcher)
  5. gen:changelogs     → content/packages/<slug>/changelog.mdx (symlink to package CHANGELOG.md)
  6. gen:source-meta    → lib/source-meta.generated.ts (typed config: redirects + category overrides)
                        + lib/symbol-index.generated.json (data: token → URL map for the link resolver)
```

Step 6 emits two artifacts on purpose. `source-meta.generated.ts` is a TypeScript module consumed by `next.config.mjs` (typed redirect rules) and by the Packages-tab category-grouping logic. `symbol-index.generated.json` is plain JSON consumed at gen time by `emit-reference-mdx.ts` and at remark-plugin runtime by the `{@link}` resolver — JSON keeps it cheap to load incrementally and small enough to gitignore comfortably.

Content directory layout under `apps/docs/`:

```
content/
  docs/               root meta.json { root: true, title: "Docs", default: true }
    get-started/
    concepts/
    apps/<slug>/      ← full app docs mirrored from apps/<slug>/docs/
    operations/
  packages/           root meta.json { root: true, title: "Packages" }
    _categories.json  drives group order
    applications/<slug>/page.mdx  (Fumadocs external-link entry to /docs/apps/<slug>/)
    cms/
      overview.mdx
      api.mdx
      blocks.mdx
      editor/…
      changelog.mdx   ← symlinked from packages/cms/CHANGELOG.md
    db/, errors/, …
  reference/          root meta.json { root: true, title: "Reference" }
    cms/api/index.mdx           ← autogen subpath overview
    cms/api/get-article.mdx     ← autogen per-symbol page
    …
  errors/             root meta.json { root: true, title: "Errors" }
    api-unknown-locale.mdx
    …
```

### Reference depth rule

A symbol gets its own page if and only if it's a **function, class, or React component**. Types, interfaces, variables, and enums stay inline on the subpath overview. Per CLAUDE.md, JSDoc is required on every function and component — the rule does not need a JSDoc-presence gate.

Two special cases:

- **Icon-heavy packages** (`react-payment-brand-icons`; auto-detected when a subpath has ≥10 React components, or opt-in via `package.json#docsConfig.iconGallery: true`) → single gallery page rendering all components in a grid with JSDoc inline.
- **Overloads** → one page per symbol name, all signatures stacked with their per-signature JSDoc.

`@internal` symbols are excluded from page generation, sidebar, and search index unless built with `?include=internal`. The dev build emits a minimal stub explaining the exclusion.

### Connectivity between Packages narrative and Reference

The Packages tab is the **narrative source of truth**. The Reference tab is **pure autogen** with a "see Packages › <pkg>" link at the top of each subpath overview. No symbol catalog is embedded inside Packages pages — readers click through to Reference for the full catalog.

Authored MDX uses `{@link X}` (explicit) plus inline-code auto-link (implicit) — both backed by the same `lib/symbol-index.generated.json` built at gen time.

**Auto-link triggers** only on inline-code spans (`` `getArticle` ``), never on plain prose, never inside fenced code blocks. Token must:

- Match a strict identifier shape: `^[a-z][A-Za-z0-9]*$` (camelCase) / `^[A-Z][A-Za-z0-9]*$` (PascalCase) / `^[A-Z][A-Z0-9_]*$` (SCREAMING_SNAKE).
- Be ≥3 chars long.
- Not appear in the JS-builtins blocklist (`Error`, `Promise`, `Array`, `Object`, primitive type names, control-flow keywords, ~50 entries).

**Resolution scoring** ranks candidates by:

1. Page proximity — same subpath > same package > same tab > cross-tab.
2. Tab affinity — current tab's targets first.
3. Kind affinity — inline-code prefers function / class / component over MDX page paths.
4. Casing signal — SCREAMING_SNAKE_CASE resolves to Errors first; PascalCase to classes/types; camelCase to functions.

**Explicit overrides:**

- `{@link symbol}` — bare, goes through scoring.
- `{@link pkg/subpath.symbol}` — explicit Reference target, no scoring.
- `{@link errors/API_UNKNOWN_LOCALE}` — explicit Errors tab.
- `{@link packages/cms/blocks}` / `{@link docs/concepts/multi-tenancy}` — explicit Packages / Docs page.

**Build-time failure modes:**

- `gen:check` (CI gate) fails on: unresolved explicit `{@link}`, or explicit `{@link}` with multiple equally-weighted matches.
- Soft warning on auto-link picking from multiple candidates; logged to `apps/docs/.docs-gen-report.json` (gitignored). A `pnpm docs:gen:report` script renders it as a table for review.

**Escape hatch:** to leave bare code text without an auto-link, wrap in a fenced code block (` ```ts getArticle ``` `) or use `<code class="no-link">` MDX. Documented; rare in practice.

### Errors tab

Categorized by code prefix (`API_*`, `INVALID_*`, etc.) with a hand-curated `_categories.json` override for outliers (`NOT_FOUND`, `UNREACHABLE`, `GENERIC_TODO` → "General"). Each page surfaces:

- Hero with code (mono large), class badge (linked to Reference), HTTP status badge, kind badge (linked to `ApiErrorKind`).
- Possible causes (amber left-rail bullets).
- "How it's thrown" code sample.
- "Thrown from" list — locations in the codebase where the error class is raised, surfaced from a build-time grep over `packages/*/src` and `apps/*/src` (extends `emit-typedoc-json.ts` with a throw-site collector).
- Related errors grid.
- Stable help URL footer (matches the `commerce-errors` `help` property template).

The Markdoc `{% card %}` containers in the current `apps/landing/docs/errors/*.mdx` are dropped during conversion — flat MDX with H2 sections (Description / Possible causes / Example) replaces the visual grouping.

### Per-package CHANGELOG

For each workspace where `type === 'package'` AND `<root>/CHANGELOG.md` exists, `gen:changelogs` symlinks the CHANGELOG into `content/packages/<slug>/changelog.mdx` with a small front-matter prepend (`{ title: "Changelog", description: "Release history for <slug>" }`). Packages without a CHANGELOG silently skip. Apps are excluded by rule — their commit history is the changelog.

## Visual system

Detailed visual mockups live in [`./visuals/`](./visuals/) — start with `00-overview.html`. Highlights:

### Tokens (see `01-tokens.html`)

- **Brand magenta:** `#ed1e79` (= `hsl(330 86% 53%)`, lifted from `apps/admin/public/logo.svg` fill). 5.6:1 on `#000`.
- **Canvas:** pure black `#000`. Surfaces step `hsl(0 0% 4% / 9% / 13%)`.
- **Semantic neons (token-only, never primary nav):** lime `hsl(95 80% 55%)` for types + Packages chip; cyan `hsl(190 95% 55%)` for function names + Reference chip; amber `hsl(28 95% 58%)` for errors/strings + Errors chip; info `hsl(220 80% 65%)` for neutral callouts.
- **Borders:** `0.138rem / 0.2rem / 0.29rem` (≈ 2.2 / 3.2 / 4.6 px) — the 3.2px default carries Nordstar's weight.
- **Radii:** `4px / 0.45rem (~7px) / 12px`.
- **Fonts:** Montserrat (variable 400-900) via `next/font/google` for display + body; Geist Mono via `geist/font/mono` for code. Reuses the existing `fonts.ts` utility shape from `apps/admin` and `apps/landing`.

### Per-tab differentiation

- Active **tab pill**: always brand magenta + soft glow (`0 0 14px rgb(237 30 121 / 0.45)`).
- **Sidebar current-page** indicator: always brand magenta (2px inset shadow + soft gradient bg + 2.2px brand left-rail).
- **Tab-context chip** at the top of each sidebar (`Reference` / `Packages` / `Errors`) wears the tab's semantic neon as a thin pill border — sole place where the per-tab neon shows up in chrome.
- Inline-code **auto-link pills** colored by target tab — cyan for Reference, amber for Errors, lime for Packages, magenta for Docs.

### Logo

Copied verbatim from `apps/admin/public/logo.svg` → `apps/docs/public/logo.svg`. Rendered inline (not as `<img>`) in the topbar at ~24-28px height. Wordmark + pink rounded-square shopping-bag mark.

### Page templates (see `02..05`)

- **Reference symbol page** — `@deprecated`/`@beta` banner; h1 with brand-accent token; kind-line with async/throws/returns-nullable badges; signature codeblock with file path title bar; parameters table with hover rows; throws block with amber left-rail; example codeblock; see-also pills; strengthened footer with two action blocks (source / metadata) + prev/next nav cards; right-side TOC.
- **Packages narrative page** — strong reference banner at top linking to `Reference › <pkg>`; h1 with brand accent + version chip; prose with auto-link pills + inline `<AutoTypeTable>` from `fumadocs-typescript`; section headings with lime left-rail; tip callout; footer with edit-on-github + report-issue actions + prev/next.
- **Errors detail page** — amber-glow hero with code + class badge + HTTP badge + kind badge; causes list (amber rail); how-it's-thrown codeblock; thrown-from list (real source locations); related errors grid; stable help URL footer.
- **Docs concept page** — editorial-weight h1 + lede; inline 5-step architecture diagram (no SVG dependency); prose with code samples; three callout flavors (info/tip/warn); "Continue exploring" 2x2 grid; prev/next nav.

### Detail sheets (see `06..09`)

- **Sidebar states** — 4 tab sidebars at rest + hover + focus-visible + collapsed group + disabled + mobile overlay.
- **Codeblock variants** — plain, with title, with line numbers, diff (+/-), multi-language tabs, inline result, twoslash hover preview, inline-code with auto-link variants, horizontal scroll with styled scrollbars.
- **Banner variants** — JSDoc banners (`@deprecated`/`@beta`/`@experimental`/`@internal`) + MDX callouts (info/tip/warn/danger/example/note) + inline pills next to symbol h1 + inline pills mid-prose.
- **Empty states** — no-JSDoc symbol, package without CHANGELOG, empty subpath (all-internal), 404 with smart fuzzy suggestions across tabs, search-no-results with rescue actions, broken `{@link}` dev-mode inline warning.

### Cross-cutting interaction polish

- `:focus-visible` ring everywhere: `0.138rem solid var(--brand)` outline, `3px` offset, `3px` border-radius.
- Hover-revealed actions (anchor links beside section heads, edit-source actions in breadcrumb).
- Copy button on every codeblock; transitions to lime "Copied ✓" for 1.5s on click.
- All transitions ride one easing curve: `cubic-bezier(0.2, 0.6, 0.2, 1)` over 100/150/250ms (fast/default/slow).
- `::selection` background = brand magenta — already in the Nordstar global style.

## Migration

Single PR, replace-in-place. No parallel routes, no feature flag.

### Removed dependencies

`nextra`, `nextra-theme-docs`, `pagefind`, `cmdk`. The `components/cmdk-palette.{tsx,test.tsx}`, `components/nav/breadcrumb.{tsx,test.tsx}`, `components/nav/docs-breadcrumb.tsx` files are deleted (Fumadocs ships built-in search + breadcrumbs).

### Added dependencies

`fumadocs-ui`, `fumadocs-mdx`, `fumadocs-core`, `fumadocs-typescript`. Transitive: `@orama/orama`.

### Retargeted scripts

- `scripts/mirror-workspace-docs.ts` — writes to `content/packages/<slug>/` (drop the `(generated)` route group). Apps are mirrored to **both** `content/docs/apps/<slug>/` (full content) and `content/packages/applications/<slug>/page.mdx` (Fumadocs external-link `meta.json` entry, no MDX page rendered).
- `scripts/generate-page-map.ts` → renamed `scripts/emit-reference-mdx.ts`. Walks `.typedoc-out/*.json` and emits per-subpath overview + per-symbol pages per the Reference depth rule. Internally absorbs the relevant helpers from `lib/page-map.ts`, `lib/workspaces.ts`, `lib/subpath-exports.ts`, `lib/typedoc-loader.ts` (which lose their separate identity).

### Replaced components

- `components/api/api-reference.tsx` → `<SymbolTable>` MDX component (used in Reference subpath overview).
- `components/api/signature.tsx` → `<Signature>` MDX component (used on per-symbol pages).
- `components/api/symbol-table.tsx` → repurposed for the autogen overview tables.

### New components

- `<DeprecatedBanner>`, `<BetaBanner>`, `<ExperimentalBanner>`, `<InternalBanner>` (rendered from JSDoc tags).
- `<Callout>` flavors: `info`, `tip`, `warn`, `danger`, `example`, `note`.
- `<InlinePill>` for inline `@deprecated`/`@beta`/`@experimental`/`@new` markers next to symbol references.
- `<Link symbol="..." />` MDX component used by the `remark-link-symbols` plugin.
- `<RedirectStub to="..." />` for apps cross-listing fallback.

### New libraries

- `lib/source.ts` — Fumadocs `loader({ baseUrl: '/docs', ... })`.
- `lib/jsdoc-link-resolver.ts` — builds the global symbol index from `.typedoc-out/*` + mirrored MDX pages + errors catalog + docs concepts; exposes resolver used by `emit-reference-mdx.ts` and the remark plugin.
- `lib/symbol-index.generated.json` — built artifact (gitignored).
- `lib/source-meta.generated.ts` — emitted redirects, category overrides.
- `mdx-components.tsx` — Fumadocs `getMDXComponents` wrapper (replaces the old Nextra version).

### Redirects

`next.config.mjs` `redirects()` emitted from `gen:source-meta`. Coverage:

- `/docs/getting-started/`                 → `/docs/get-started/quickstart/`
- `/docs/architecture/`                    → `/docs/get-started/architecture/`
- `/docs/contributing/`                    → `/docs/operations/contributing/`
- `/docs/deployment/`                      → `/docs/operations/deployment/`
- `/docs/conventions/`                     → `/docs/operations/conventions/`
- `/docs/typescript-project-structure/`    → `/docs/operations/typescript-project-structure/`
- `/docs/(generated)/<slug>/`              → `/docs/packages/<slug>/`         (one rule per workspace slug)
- `/docs/(generated)/<slug>/<rest>/`       → `/docs/packages/<slug>/<rest>/`  (catch-all)
- `/docs/(generated)/<slug>/<subpath>/`    → `/docs/reference/<slug>/<subpath>/` (where the original page was an autogen stub embedding `<ApiReference>` — detected by inspecting current page-map entries)

### Content port

- Move `apps/docs/app/docs/{getting-started,architecture,contributing,deployment,conventions,typescript-project-structure}/page.mdx` to their new `content/docs/...` paths with Fumadocs frontmatter (`title`, `description`, `icon?`).
- Hand-translate each existing `_meta.json` to Fumadocs `meta.json` (subtly different schema — Fumadocs uses `pages` array, optional `defaultOpen`, etc.).
- Convert `apps/landing/docs/errors/*.mdx` from Markdoc to MDX via `scripts/port-errors.ts`. Drop the `WORKSPACE_EXCLUDES.landing` rule from `mirror-workspace-docs.ts`.
- Existing per-workspace `docs/*.mdx` files are unchanged on disk; the mirror retargets where they're written into the content tree.

### Tests

Per the agreed strategy: keep tests for behaviors that survive, write new tests for new generators, do not rewrite e2e in this PR.

**Deleted** (component no longer exists or replaced):

`components/cmdk-palette.test.tsx`, `components/nav/breadcrumb.test.tsx`, `lib/page-map.test.ts`, `lib/typedoc-loader.test.ts`, `components/api/api-reference.test.tsx`, `components/api/signature.test.tsx` (all replaced).

**Folded** (logic survives in `scripts/emit-reference-mdx.ts`; assertions move into its tests):

`lib/workspaces.test.ts`, `lib/subpath-exports.test.ts` — these test helpers that the new emitter absorbs internally, so their coverage moves into `emit-reference-mdx.test.ts`.

**Kept** (behavior unchanged):

`lib/env.test.ts`.

**New** (gen pipeline):

- `scripts/emit-reference-mdx.test.ts` — golden-file test on a tiny fixture TypeDoc JSON tree covering: function with full JSDoc, class with `@deprecated`, overload, React component, `@internal` exclusion, gallery mode.
- `lib/jsdoc-link-resolver.test.ts` — covers same-subpath, cross-subpath, cross-package, cross-tab resolution; the scoring algorithm; explicit-prefix overrides; failure modes.
- `scripts/port-errors.test.ts` — Markdoc-to-MDX conversion fixture, including the `{% card %}` strip and H4→H2 normalization.
- `lib/source-meta.generated.test.ts` — verifies emitted redirects cover every former `(generated)/<slug>` path.
- `scripts/symlink-changelogs.test.ts` — symlink creation, frontmatter prepend, app-exclusion rule.

**E2E (`apps/docs/e2e/*.spec.ts`)** — left as-is in this PR. Existing specs will fail against the new URL shape; they're disabled or skipped pending the separate e2e overhaul effort.

## Open risks

These are flagged for plan.md to handle, not unresolved design questions:

- **Static export + Fumadocs search route handler.** `app/api/search/route.ts` needs `export const revalidate = false` + `staticGET` from `createFromSource(source)` to be materialized as a static JSON file under `output: 'export'`. Verified against Fumadocs docs at design time but not yet wired.
- **`dev:watch` performance.** The pipeline grows from 3 to 6 pre-steps. The watcher must rebuild incrementally — JSDoc edits should only re-emit affected reference pages, mirror edits should only refresh the changed file, source-meta should regen only on workspace adds/removes. The current `scripts/watch-docs.ts` will need a rewrite.
- **`basePath` threading.** `NEXT_PUBLIC_DOCS_BASE_PATH` (`/commerce` on GitHub Pages, `/docs` for some microfrontend deploys) must flow into Fumadocs' `loader({ baseUrl })` and into every internal link the generator emits. Current Next config already handles `basePath` + `assetPrefix`; the generator must use a single source-of-truth helper.
- **Search index size.** Per spec § Q11, Reference per-symbol pages are indexed with title + description + signature only (not body) to keep the static Orama index below ~500KB gzip. Profiling at end of migration: if >800KB, fall back to tab-scoped indexes loaded on demand.
- **Per-symbol bundle volume.** A fully-documented monorepo could emit 300-500 generated MDX pages. Build time and gitignore impact: `content/reference/**` is gitignored; build time grows mostly via Next's per-route compilation, not the gen step. Monitor under realistic JSDoc coverage.
- **Fumadocs version churn.** Fumadocs is on a fast release cadence (v16 introduced the React 19.2+ requirement we currently sit on). Pin and review at every renovate-bot bump.

## Out of scope (deferred)

- Versioning, i18n, API playground, Recipes/Cookbook tab — explicitly deferred. None block this refactor.
- E2E rewrite — separate effort, separate PR.
- Migration of any content currently rendered via Nextra-specific MDX components that don't have a Fumadocs equivalent: such cases get plain-text fallbacks and a TODO comment in the migrated page; no Nextra polyfill layer is shipped.

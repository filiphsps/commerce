---
name: design-md
description: Generate, refresh, and validate DESIGN.md files that capture a project's visual identity as machine-readable design tokens (YAML frontmatter) plus human-readable rationale (markdown prose), so AI agents generating new screens stay on-brand. Monorepo-aware — writes a global root DESIGN.md and per-workspace override DESIGN.md files that cascade (workspace overrides root). Validates with the official `@google/design.md` CLI (lint + diff). Use when the user wants to document or capture the visual design system / visual identity, create or refresh a DESIGN.md, establish design tokens for AI consumption, keep agents on-brand, lint a DESIGN.md, or mentions "DESIGN.md", "design tokens", or "visual identity". This is for documenting a visual identity into a DESIGN.md — NOT for code, function, or API documentation (use code-documenter), and NOT for refactoring code into shared components/tokens (use extract).
---

# DESIGN.md

Capture the visual identity in a `DESIGN.md` so AI agents generating new screens stay on-brand. A `DESIGN.md` is **YAML frontmatter** (machine-readable design tokens) followed by a **markdown body** of up to eight `##` sections in fixed order. **Tokens are normative; prose says how to apply them.** Full schema, section list, and template in [reference/format.md](reference/format.md). Files are validated with the official `@google/design.md` CLI — author to the spec so `lint` passes.

## In this repo

`commerce` is a pnpm + turbo monorepo with four apps (`apps/storefront`, `apps/landing`, `apps/admin`, `apps/docs`) and shared code in `packages/*` (`@nordcom/commerce-*`). Storefront UI is under `apps/storefront/src/components/` (e.g. `product-card`, `product-options`, `typography`, `layout`).

**Styling is Tailwind v4 (CSS-first).** There are no `tailwind.config.*` files — don't look for them. Each app declares its tokens in an `@theme inline { … }` block inside its CSS entry (`apps/<app>/src/app/globals.css`, or `apps/docs/app/globals.css`). That `@theme` block **is** the token source. Components consume tokens via v4 utilities, including the arbitrary-property form: `bg-(--product-card-cta-bg)`, `text-(--token)`, `rounded-(--token)`. There is **no central token file**.

If no root `DESIGN.md` exists yet, a first run creates it from the shared/common tokens; per-app overrides land in `apps/<app>/DESIGN.md`. Read any sibling `CLAUDE.md` / `AGENTS.md` / `.claudelint/` for context, but keep `DESIGN.md` strictly visual.

## Step 0: Determine scope (the cascade)

Detect the monorepo (`pnpm-workspace.yaml`, a `workspaces` field, `turbo.json`, `nx.json`, or `lerna.json`). If found, decide scope **before** scanning:

- **Root scope** → `./DESIGN.md`: the global, standardized system shared across workspaces. Base layer everything inherits.
- **Workspace scope** → `apps/<x>/DESIGN.md` or `packages/<x>/DESIGN.md`: only the visual **overrides and additions** specific to that workspace.

Infer scope from the cwd or the path the user pointed at. If ambiguous, ask with `AskUserQuestion` — root global vs a named workspace. Single-package repo → root `DESIGN.md` only; skip the cascade.

**How the files relate:**

- **Resolution order** for an agent generating UI in workspace `W`: `W/DESIGN.md` → root `DESIGN.md` (workspace wins on conflict). Mirrors this repo's own locale fallback doctrine.
- A workspace `DESIGN.md` carries **deltas only** — overridden tokens + workspace-only tokens/components. Never restate tokens that match root. Mark the inheritance with an HTML comment as the **first line of the markdown body** (after the frontmatter): `<!-- extends: ../../DESIGN.md — overrides below; everything else inherits root -->`, and repeat it in one Overview sentence. Do **not** add an `extends:` key to the frontmatter — the token schema is closed and an unknown top-level key fails `lint`.
- **Sibling files (read for context, never duplicate):** `AGENTS.md` = global AI operating guidelines; per-workspace `CLAUDE.md` = build/test rules; `.claudelint/` = lint rules for AI changes — respect them when writing. `DESIGN.md` stays strictly visual.

## Two modes: scan vs seed

- **Scan** (default): the project has tokens, components, or rendered output to extract. Decide by scanning first (Step 1).
- **Seed**: pre-implementation — nothing built. Interview for a few high-level answers, write a minimal scaffold marked `<!-- SEED: re-run once there's code to capture real tokens. -->`, re-run in scan mode once code exists. Offer seed mode only when the scan finds nothing; don't silently switch.

If a `DESIGN.md` already exists at the target path, **do not silently overwrite**. Show the user the existing file and ask (`AskUserQuestion`) whether to refresh, overwrite, or merge.

## Scan mode

### Step 1: Find the design assets

Tailwind v4 (CSS-first) — the `@theme` block, not a JS config, is the source of truth. Search in order, recording name, value, and defining file:

1. **Tailwind v4 `@theme`** (primary) — read every `@theme` / `@theme inline { … }` block in the app's CSS entry (`globals.css`). Those tokens map straight to the frontmatter: `--color-*` → `colors`, `--text-*`/`--font-*`/`--font-weight-*`/`--tracking-*`/`--leading-*` → `typography`, `--radius-*` → `rounded`, `--spacing`/`--spacing-*` → `spacing`. (`--shadow-*`/`--ease-*`/`--animate-*` have no token group — document them in the Elevation & Depth / Layout prose.) No `tailwind.config.*` exists in v4 — don't search for one.
2. **Resolve aliases** — `@theme inline` usually aliases raw `:root` custom properties (`--color-primary: var(--color-accent-primary)`). Follow the `var()` chain to the literal hex and record both the Tailwind token name and the resolved value. **Frontmatter colors must be `#` hex sRGB** — resolve any `oklch()`/`var()` to hex for the token; keep the original notation in prose if it matters.
3. **Raw `:root` custom properties** not surfaced through `@theme` — component-scoped vars like `--product-card-cta-bg`, consumed via v4 arbitrary utilities. Still real tokens.
4. **Component library** — main button, card, input, nav, dialog; note variant APIs and default styles. Translate v4 utilities (`bg-primary`, `rounded-lg`, `text-(--token)`) back to `@theme` tokens.
5. **Rendered output** — if browser tools are available, sample computed styles from `body`, `h1`, `a`, `button`, `.card`.

**Scope-aware sources:** Root scope → scan cross-workspace shared sources first (`packages/*`, common `@theme` tokens shared by 2+ apps). Workspace scope → scan that workspace's `@theme`/components, then read the root `DESIGN.md` as the inherited base. You are looking for **divergence**, not the full set.

### Step 2: Auto-extract, then diff

Build a structured draft — group colors by role (primary / secondary / tertiary / neutral), map type to levels (display / headline / body / label, sized small/medium/large), capture the spacing scale, rounded scale, and per-component shape/color/states. Stage the YAML frontmatter (schema in [reference/format.md](reference/format.md)). Skip anything the project doesn't have — fabricated tokens pollute the spec.

**Workspace scope:** diff every extracted value against root. Keep **only** values that differ or are absent. Matching tokens are dropped (they inherit).

### Step 3: Ask for qualitative language

Auto-extraction can't produce creative language. Group into one `AskUserQuestion`: brand personality / North Star, target audience + emotional response, descriptive color names ("Boston Clay", not "red"), elevation philosophy (shadows vs tonal layers), component feel. Quote a line from `AGENTS.md` or a brand/PRODUCT doc when one exists so the user's strategic language carries forward.

### Step 4: Write DESIGN.md

Write the frontmatter, then the body using the **eight canonical sections in order** (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts) per [reference/format.md](reference/format.md). Omit sections that don't apply, but never reorder or duplicate them — duplicate headings make `lint` reject the file. For workspace scope, lead with the `extends` comment and keep the body to overrides + additions only.

### Step 5: Validate

Run the official linter and act on findings:

```bash
pnpm dlx @google/design.md lint DESIGN.md
```

It validates against the spec, catches broken token references, and reports WCAG contrast ratios — structured JSON (`findings[]` with `severity`/`path`/`message`, plus a `summary`). **Fix every error**; review warnings (e.g. a component `textColor`/`backgroundColor` pair below WCAG AA) and resolve or justify them.

**Cascade caveat — lint the *merged* file, not the raw workspace delta.** `lint` reads one file and resolves token refs (`{colors.*}`, `{rounded.*}`, …) only against tokens in *that* file; it ignores the `extends` comment. So a deltas-only workspace file whose component overrides reference inherited root primitives will report **broken refs** that aren't real, and WCAG contrast **fails open** when only one of a `backgroundColor`/`textColor` pair is overridden (no pair → no check). Therefore:

- **Root file:** lint it directly — it's self-contained.
- **Workspace file:** build a temporary composed file = root frontmatter **deep-merged** with the workspace frontmatter (workspace wins), then lint *that*. It is authoritative.
  ```bash
  # author writes apps/storefront/.design.merged.md = root ⊕ workspace, then:
  pnpm dlx @google/design.md lint apps/storefront/.design.merged.md
  ```
  A broken-ref finding whose path resolves in root is a cascade artifact — don't "fix" it by restating or deleting the token. Genuinely missing refs and contrast failures **on the composed file** are real; fix those.

When refreshing an existing file, diff old vs new to catch regressions:

```bash
pnpm dlx @google/design.md diff DESIGN.prev.md DESIGN.md
```

`regression: true` means a token or section was removed or weakened — confirm that's intended before keeping it.

### Step 6: Confirm and refine

Show the file and the lint summary. Call out non-obvious creative choices (descriptive names, named rules) and any contrast warnings. Offer to revise a section, add missed components, or adjust language. For workspace scope, confirm the deltas read as overrides, not a re-statement of the global system.

## Seed mode

For pre-implementation projects. Confirm seed mode, then group five questions into one `AskUserQuestion`: color strategy + hue anchor, typography direction, motion energy, three named references, one anti-reference. A seed file **still needs valid frontmatter** — write a minimal block beginning on line 1 with at least `name:` (optionally `version: alpha` and `description:`), no `colors`/`components` yet, so it passes `lint`. Then lead the body (first line after the closing `---`) with `<!-- SEED: re-run once there's code to capture real tokens. -->`. Tell the user to re-run in scan mode once code exists.

## Monorepo rules

- **Do** keep the root `DESIGN.md` to the shared, global system; keep workspace files to deltas only.
- **Do** mark inheritance with the `<!-- extends: … -->` comment + one Overview sentence — not a frontmatter key.
- **Do** `lint` every file you write (the *merged* file for workspace deltas — see Step 5) and `diff` on every refresh.
- **Don't** repeat a root token in a workspace file when the value is unchanged — inheritance covers it.
- **Don't** put workspace-specific overrides in the root file.
- **Don't** let a workspace silently redefine a root token — every override gets an explicit prose note saying what changed and why.

## Never

- Overwrite an existing `DESIGN.md` without asking.
- Paste raw CSS or Tailwind utility classes — translate to descriptive language with the `@theme` token and exact value in parens.
- Use a non-hex color in the frontmatter — `colors` values must be `#` hex sRGB; resolve `oklch()`/`var()` first.
- Add frontmatter keys outside the schema (`version`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components`) — anything else risks failing `lint`.
- Extract every token — stop at what's actually reused; one-offs pollute the system.
- Invent components or colors that don't exist.
- Reorder or duplicate the eight sections — tooling parses the order, and a duplicate heading is a hard `lint` error.
- Duplicate a token value between frontmatter and prose — frontmatter is normative.

---

Workflow adapted from the [impeccable](https://github.com/pbakaus/impeccable) skill's `document` command (Apache 2.0; based on Anthropic's frontend-design skill). Format and validation follow the [`@google/design.md`](https://github.com/google-labs-code/design.md) spec and CLI. Tailwind v4 mapping and the monorepo cascade are local to this repo.

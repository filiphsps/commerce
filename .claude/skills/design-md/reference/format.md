# DESIGN.md format reference

The authoritative spec is [`@google/design.md`](https://github.com/google-labs-code/design.md) (`docs/spec.md`, version `alpha`). The `lint` CLI validates against it, so author to this reference. Below: file structure, the frontmatter token schema, the eight sections, component tokens, consumer behavior, a full template, the Tailwind v4 → token mapping, authoring voice, the monorepo cascade, and validation.

## File structure

Two layers, in this order:

1. **YAML frontmatter** — machine-readable design tokens. Must begin on line 1 with a line containing exactly `---` and end with a line containing exactly `---`. Nothing may precede the opening fence (no HTML comment, no blank line).
2. **Markdown body** — human-readable rationale in `##` sections. An optional `#` title may appear but is not parsed as a section.

**Tokens are normative. Prose contextualizes them.** Don't redefine a token's value in two places.

## Frontmatter token schema

```yaml
---
version: alpha            # optional; current version string
name: <string>            # required
description: <string>     # optional
colors:
  <token-name>: <Color>
typography:
  <token-name>: <Typography>
rounded:
  <scale-level>: <Dimension>
spacing:
  <scale-level>: <Dimension | number>
components:
  <component-name>:
    <prop-name>: <string | token reference>
---
```

`<scale-level>` is any descriptive string key — common: `xs`, `sm`, `md`, `lg`, `xl`, `full`. These are the **only** top-level keys; anything else risks a `lint` failure.

### Token types

| Type | Format | Example |
|:--|:--|:--|
| **Color** | `#` + hex in sRGB only | `"#1A1C1E"` |
| **Dimension** | number + unit (`px`, `em`, `rem`) | `48px`, `-0.02em` |
| **Token reference** | `{path.to.token}` → a primitive (composite refs like `{typography.label-md}` allowed only inside `components`) | `{colors.primary}` |
| **Typography** | object with `fontFamily` (string), `fontSize` (Dimension), `fontWeight` (number), `lineHeight` (Dimension \| unitless number = ×fontSize), `letterSpacing` (Dimension), `fontFeature` (string), `fontVariation` (string) | see template |

Colors are **hex sRGB only** — resolve `oklch()` / `var()` chains to hex before writing the token. Spacing accepts a unitless number (column counts, ratios).

## The eight sections (fixed order, exact headings)

`##` headings. Omit any that don't apply, but keep this order; **a duplicate heading makes `lint` reject the file.** Aliases in parens are accepted.

| # | Section | Alias | Holds | Token group |
|:--|:--|:--|:--|:--|
| 1 | **Overview** | Brand & Style | personality, audience, emotional response, density | — |
| 2 | **Colors** | | palette + roles; at least `primary` | `colors` |
| 3 | **Typography** | | 9–15 type levels, roles | `typography` |
| 4 | **Layout** | Layout & Spacing | grid model, spacing rhythm | `spacing` |
| 5 | **Elevation & Depth** | Elevation | shadows vs tonal layering vs borders | — |
| 6 | **Shapes** | | corner radii, shape language | `rounded` |
| 7 | **Components** | | per-component style guidance | `components` |
| 8 | **Do's and Don'ts** | | guardrails, common pitfalls | — |

## Component tokens

Map a component name to a group of sub-token props. Values are literals or token references.

```yaml
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
```

**Valid props (only these):** `backgroundColor` (Color), `textColor` (Color), `typography` (Typography), `rounded` (Dimension), `padding` (Dimension), `size` (Dimension), `height` (Dimension), `width` (Dimension).

**Variants** (hover / active / pressed) are separate entries with a related key name (`button-primary`, `button-primary-hover`, `button-primary-active`). Anything these props can't hold (shadow, focus ring, transition, backdrop-filter) goes in the **prose**, not the frontmatter.

## Consumer behavior for unknown content

| Scenario | Behavior |
|:--|:--|
| Unknown section heading (`## Iconography`) | preserve; no error |
| Unknown color token name | accept if value is valid |
| Unknown typography token name | accept |
| Unknown spacing value (`grid-columns: '5'`) | accept; store as string if not a valid Dimension |
| Unknown component property (`borderColor`) | accept **with warning** |
| **Duplicate section heading** | **error — file rejected** |

## Recommended token names (non-normative)

- **Colors:** `primary`, `secondary`, `tertiary`, `neutral`, `surface`, `on-surface`, `error`
- **Typography:** `headline-display`, `headline-lg`, `headline-md`, `body-lg`, `body-md`, `body-sm`, `label-lg`, `label-md`, `label-sm`
- **Rounded:** `none`, `sm`, `md`, `lg`, `xl`, `full`

## Full template

```markdown
---
version: alpha
name: "[Project Title]"
description: "[one-line tagline]"
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  headline-lg:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.1em
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  gutter: 24px
rounded:
  sm: 4px
  md: 8px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
---

# [Project Title]

## Overview

**Creative North Star: "[Named metaphor]"**

[2–3 paragraphs: personality, target audience, the emotional response the UI should evoke (playful/professional, dense/spacious). State what this system explicitly rejects. End with a short **Key Characteristics:** list.]

## Colors

[One sentence on the palette character.]

- **Primary ([Descriptive Name], #1A1C1E):** [where and why — be specific about context, not just role.]
- **Secondary ([Name], #6C7278):** [role.]
- **Tertiary ([Name], #B8422E):** [the sole interaction driver, etc.]
- **Neutral ([Name], #F7F5F2):** [surface / background role.]

**The [Rule Name] Rule.** [Forceful doctrine, e.g. "The One Voice Rule. The accent appears on ≤10% of any screen. Its rarity is the point."]

## Typography

**Display/Headline:** [Family] · **Body:** [Family] · **Label/Mono:** [Family if distinct]

**Character:** [1–2 sentences on the pairing's personality.]

- **Headline** ([weight], [size], [line-height]): [purpose.]
- **Body** ([weight], [size], [line-height]): [purpose; line length 65–75ch if relevant.]
- **Label** ([weight], [size], [letter-spacing], case): [purpose.]

## Layout

[Grid model (fluid / fixed-max-width), the spacing scale and its rhythm (e.g. strict 8px with 4px half-step), containment/padding strategy.]

## Elevation & Depth

[How hierarchy is conveyed: shadows, tonal layering, or borders. If flat, say so and describe the alternative. Give exact `box-shadow` values if used.]

**The [Rule Name] Rule.** [e.g. "The Flat-By-Default Rule. Surfaces are flat at rest; shadows appear only on state change."]

## Shapes

[Corner-radius language and exact values, e.g. "Architectural Sharpness — 4px on all interactive elements."]

## Components

### Buttons
- **Shape / Primary / Hover / Secondary·Ghost:** [semantic + exact terms; reference tokens.]

### Inputs · Cards · Navigation · [Signature component]
- [Shape, color assignment, states (hover / focus-visible / active), distinctive behavior.]

## Do's and Don'ts

- **Do** [specific prescription with exact values / a named rule].
- **Do** maintain WCAG AA contrast (4.5:1 for normal text).
- **Don't** [specific prohibition — quote the project's anti-references by name].
- **Don't** mix rounded and sharp corners in the same view.
```

## Tailwind v4 → token mapping (CSS-first)

This repo is Tailwind v4: tokens live in `@theme inline { … }` in each app's `globals.css`, not a JS config. Map them to the frontmatter:

| Tailwind v4 `@theme` token | DESIGN.md group |
|:--|:--|
| `--color-*` | `colors` (resolve `var()`/`oklch()` → hex sRGB) |
| `--text-*` (size) + `--font-*`, `--font-weight-*`, `--tracking-*`, `--leading-*` | `typography` levels |
| `--spacing`, `--spacing-*` | `spacing` |
| `--radius-*` | `rounded` |
| `--shadow-*`, `--ease-*`, `--animate-*` | no token group → describe in **Elevation & Depth** / **Layout** prose |

`@theme inline` aliases raw `:root` custom props (`--color-primary: var(--color-accent-primary)`); follow the chain to the literal value. When documenting a component, translate v4 utilities — including the arbitrary forms `bg-(--token)`, `text-(--token)`, `rounded-(--token)`, `p-(--token)` — back to the resolved token name + exact value. Never paste the utility class string into prose.

## Authoring voice

- **Descriptive > technical:** "Warm limestone (#F7F5F2)" beats "neutral-50". Lead with the descriptive name; put the exact value in parens.
- **Functional > decorative:** for each token, say *where* and *why* it's used, not just what it is.
- **Named Rules:** `**The [Name] Rule.** [short doctrine]` — memorable and citable. 1–3 per section.
- **Be forceful:** design-director voice. "Never", "always", "forbidden" — not "consider", "prefer".
- **Concrete anti-pattern tests:** "If it looks like a 2014 app, the shadow is too dark and the blur too small" beats a paragraph of principle.
- **Group colors by role** (primary / secondary / tertiary / neutral), not by hue or hex order.
- **Carry anti-references through:** every brand/PRODUCT/`AGENTS.md` anti-reference should reappear as a "Don't" in the same words.

## Monorepo cascade

Root `DESIGN.md` = the global, shared system. A workspace `apps/<x>/DESIGN.md` carries **deltas only** — overridden tokens + workspace-only tokens/components. Resolution order: workspace → root (workspace wins).

- **Mark inheritance with an HTML comment as the first line of the body** (after the closing `---`), plus one Overview sentence:

  ```markdown
  ---
  version: alpha
  name: "Storefront (extends Commerce root)"
  colors:
    tertiary: "#0F7B6C"   # OVERRIDE: storefront uses teal, not the root clay
  ---

  <!-- extends: ../../DESIGN.md — overrides below; everything else inherits root -->

  ## Overview

  Extends the root Commerce design system. Only the storefront's divergences are documented here…
  ```

- The `<!-- extends … -->` comment is the **first body line**; the optional `#` title either follows it or is omitted (neither the comment nor an `#` title is parsed as a `##` section, but keep the comment first so the inheritance marker is unmissable).
- **Never** add an `extends:` frontmatter key — the schema is closed and `lint` rejects unknown top-level keys. The comment + prose is the marker.
- **Never** restate a token whose value matches root. Each override carries a prose note on *what* changed and *why*.

**A deltas-only workspace file is not standalone-lint-clean for token references.** Primitive groups carry no refs, so a primitives-only delta (e.g. an overridden `colors.tertiary` hex) lints fine alone. But a component override or workspace-only component that references an *inherited* primitive (`backgroundColor: "{colors.primary}"` where `primary` lives only in root) reports a **broken ref** against the standalone file, and a one-sided `backgroundColor`/`textColor` override makes the WCAG check **fail open** (no pair → no contrast finding). The CLI doesn't understand the cascade — so validate the **merged** file (see Validation).

## Validation

Author to the spec, then validate with the official CLI (this repo uses `pnpm dlx`). `lint` reads **one file** and resolves token refs only against tokens in that file — it has no concept of the cascade.

```bash
# Root (self-contained) — lint directly. Spec conformance, broken refs, WCAG contrast.
pnpm dlx @google/design.md lint DESIGN.md

# Workspace delta — lint the MERGED file (root frontmatter ⊕ workspace, workspace wins),
# so inherited refs resolve and bg/text pairs reunite for the contrast check.
pnpm dlx @google/design.md lint apps/storefront/.design.merged.md

# Compare versions on refresh — token + prose regressions
pnpm dlx @google/design.md diff DESIGN.prev.md DESIGN.md
```

`lint` emits JSON: `findings[]` (`severity` = error / warning / info, `path`, `message`) plus `summary` (`errors`, `warnings`, `infos`). **Resolve every error.** Common warnings: a component `textColor`/`backgroundColor` pair below WCAG AA — fix or justify.

For a **workspace delta**, the merged file is authoritative: a broken-ref finding on the raw delta whose path resolves in root is a cascade artifact, not a real error — don't "fix" it by restating or deleting the token. Build the merged file by deep-merging root frontmatter under the workspace frontmatter; it's a throwaway, so keep it gitignored or delete it after linting.

`diff` emits per-group `added`/`removed`/`modified` plus a `regression` boolean; `regression: true` means something was removed or weakened — confirm intent before keeping.

## Pitfalls

- Frontmatter must be line 1 — no comment or blank line before the opening `---`. The cascade marker goes in the **body**.
- Colors are hex sRGB only; non-hex fails validation.
- Don't reorder or duplicate sections — duplicates are a hard error.
- Don't invent components or tokens that don't exist; don't extract one-offs.
- Don't duplicate a value between frontmatter and prose — frontmatter is normative.
- Don't restate inherited tokens in a workspace file — deltas only.
- Don't lint a raw workspace delta and "fix" its broken refs — lint the merged file (root ⊕ workspace); refs that resolve in root are cascade artifacts.

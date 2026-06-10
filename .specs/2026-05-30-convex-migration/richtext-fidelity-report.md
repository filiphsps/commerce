# G-RICH fidelity gate report (CMSRICH-03)

Round-trip fidelity gate for the Lexical → ProseMirror migration: every rich-text value is
converted through the REAL CMSRICH-04 codec (`packages/cms/src/editor/richtext/lexical-to-prosemirror.ts`
— the exact module `scripts/etl/transform/shred-richtext.ts` imports), rendered on both sides, and
semantic-diffed. Gate script: `scripts/richtext-fidelity-check.ts`.

## Verdict — in-repo corpus

**GREEN. Zero semantic diffs, zero quarantines** over the entire available rich-text corpus.

```
[richtext-fidelity] corpus: in-repo
[richtext-fidelity]   - apps/storefront/src/blocks/rich-text-renderer.test.tsx (golden parity fixtures): 12 fixtures
[richtext-fidelity]   - packages/test-convex/src/seed/fixtures/richtext.ts (seed-builder sweep): 9 documents
[richtext-fidelity]   - packages/test-convex/src/seed/fixtures/articles.ts (HARNESS-12 articles): 10 bodies
[richtext-fidelity]   - packages/test-convex/src/seed/fixtures/collection-metadata.ts (HARNESS-12 collectionMetadata): 10 bodies
[richtext-fidelity]   - packages/test-convex/src/seed/fixtures/pages.ts (HARNESS-12 pages): 24 bodies
[richtext-fidelity]   - packages/test-convex/src/seed/fixtures/product-metadata.ts (HARNESS-12 productMetadata): 58 bodies
[richtext-fidelity] documents=77 fields=123
[richtext-fidelity] nodes: heading=91 linebreak=2 link=5 list=47 listitem=148 paragraph=132 quote=1 text=380
[richtext-fidelity] marks: bold=3 code=1 italic=2 link=5 strike=2 underline=2
[richtext-fidelity] prosemirror-native (already converted, skipped)=0
[richtext-fidelity] semantic diffs: 0
[richtext-fidelity] quarantined: 0
[richtext-fidelity] PASS
```

Exit code `0`. Re-runnable; the report output is deterministic (input-derived ordering only — the
gate's own vitest pins byte-identical reports across runs).

## Corpus enumerated (what was found in-repo)

The repo contains NO production dump (the sandbox has no Mongo access), so today's green run covers
every Lexical fixture that exists in the repository — the report is explicit about that scope:

1. **Storefront golden parity fixtures** (`apps/storefront/src/blocks/rich-text-renderer.test.tsx`)
   — 12 fixtures, 11 of them paired with the exact pre-rewrite Lexical-renderer DOM (captured
   immediately before the ProseMirror rewrite; CMSRICH-02). These pinned HTML strings are the
   Lexical-side render oracle's self-check: the gate's oracle must reproduce them byte-for-byte on
   every run, or the run fails (`oracle-pin` diff). The 12th (nested list) is pinned semantically —
   it IS the one sanctioned DOM difference (see normalization below).
2. **HARNESS-12 seed builders** (`packages/test-convex/src/seed/fixtures/richtext.ts`) — a 9-document
   sweep over the full builder surface (`paragraph`, incl. empty; `heading` h1–h4; `list`
   bullet/number; composite), authored through the real builders.
3. **HARNESS-12 fixture bodies** — all 102 stored ProseMirror bodies across
   `pages.ts` (24), `articles.ts` (10), `product-metadata.ts` (58), `collection-metadata.ts` (10).
   Every body's builder-authored Lexical source is recovered by inverting the builder vocabulary,
   and the recovery is verified hard: the recovered source must re-convert through the codec to
   EXACTLY the stored ProseMirror JSON (`stored-prosemirror` diff otherwise), then both sides render
   and semantic-diff like every other item. A body outside the builder vocabulary quarantines
   (`outside-builder-vocabulary`) — none did.

Census: 77 documents, 123 rich-text fields, 806 Lexical nodes
(text=380, listitem=148, paragraph=132, heading=91, list=47, link=5, linebreak=2, quote=1),
marks: bold=3, italic=2, strike=2, underline=2, code=1, link=5.

The codec's own unit fixtures (`packages/cms/src/editor/richtext/lexical-to-prosemirror.test.ts`)
remain covered by that suite and are not re-enumerated here.

## How the comparison works

- **Lexical side**: a pure render oracle reproducing the deleted pre-rewrite renderer's DOM
  contract, hard-pinned to the CMSRICH-02 golden HTML on every run (oracle drift = run failure).
  One deliberate strengthening: a non-default ordered-list `start` is rendered (the legacy renderer
  dropped it), so a codec/renderer regression that loses `start` fails the gate.
- **ProseMirror side**: the LIVE storefront renderer (`apps/storefront/src/blocks/rich-text-renderer.tsx`)
  rendered via `react-dom/server`'s `renderToStaticMarkup`, with `@/components/link` substituted by
  the same plain-anchor stub the golden suite pinned the legacy DOM against
  (`scripts/richtext-fidelity-link-stub.ts`).
- **Semantic diff**: both HTML strings parse into trees and normalize before comparison. The
  normalization deliberately ignores ONLY:
  - attribute order, entity-encoding style, and void-tag self-closing syntax;
  - volatile attributes: `class`, `style`, `data-*`, and `start="1"` on `<ol>` (the HTML default);
  - runs of ASCII whitespace inside text (collapsed to one space; U+00A0 preserved);
  - the sanctioned nested-list shape: a `<li>` containing only nested lists merges into the
    preceding `<li>` (legacy structural-sibling shape vs. Tiptap's re-homed shape — pinned as the
    one sanctioned difference by the storefront golden suite);
  - a document that is exactly one empty `<p>` normalizes to empty (the codec's canonical empty
    state vs. the legacy renderer's empty output; the storefront skips both via `isRichTextEmpty`).

  Everything else — tag structure, text content, marks, link `href`/`target`/`rel` — compares
  exactly.

## Hard-fail contract

- Any unconvertible node RAISES into the quarantine list with **doc id + field path + node type**
  (e.g. `relationship`, `upload`, `text.format:64`), and is never dropped.
- Any semantic diff or quarantine (including unparsable dump lines and unrecoverable fixture
  bodies) makes the run exit **non-zero**.
- Verified by the gate's vitest (`scripts/richtext-fidelity-check.test.ts`): known-good corpus
  passes; a planted semantic mutation FAILS (`rendered-dom`); a planted oracle drift FAILS
  (`oracle-pin`); planted unknown nodes and sub/superscript format bits QUARANTINE; the
  mongoexport dump path is exercised end-to-end against a synthetic mini-dump.

## Re-running (including the cutover-time run against a real dump)

```sh
# In-repo corpus (this report's run):
pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/richtext-fidelity-check.ts

# Cutover-time run against a real mongoexport dump directory (one <collection>.jsonl per
# collection — the PIPELINE-01 export shape produced by `scripts/etl/export.ts`):
pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/richtext-fidelity-check.ts /path/to/dump
# (equivalently: RICHTEXT_DUMP_DIR=/path/to/dump pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/richtext-fidelity-check.ts)
```

The gate's vitest runs with the scripts project:
`pnpm exec vitest run --config scripts/vitest.config.ts scripts/richtext-fidelity-check.test.ts`.

## Cutover precondition

**CUTOVER-04/05/06 REQUIRE re-running this gate against the production mongoexport dump** and
getting the same green verdict (exit 0, zero diffs, zero quarantines). The in-repo run above proves
the pipeline; it does NOT certify production content — only the dump-mode run at cutover time does.
Any quarantined production document must be resolved (content fixed at source, or the codec
extended) before CMS content cutover proceeds.

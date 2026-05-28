# Spec: PropsTable visualizer + SourceFooter mobile fix

## Problem

1. **Type/props rendering**: Object types on reference pages are rendered as flat Markdown
   tables with type strings in cells. References within those strings are not linked.
   Long interfaces with many properties have no collapse affordance.

2. **SourceFooter on mobile**: The two-column grid overflows on narrow screens when the
   source file path is long. The path needs progressive truncation, and the columns need
   to stack vertically on mobile.

---

## Part 1 — PropsTable component

### Token format

Produced at gen time, consumed at runtime:

```ts
type TypeToken =
  | { t: 'ref'; text: string; href: string }  // reference resolved to a docs URL
  | { t: 'kw';  text: string }                // keyword or unresolved identifier
  | { t: 'lit'; text: string }                // literal value ('foo', 42, null)
  | { t: 'op';  text: string };               // punctuation: |, &, <, >, [], {}, (, ), ;, ,

type PropRow = {
    name: string;
    opt:  boolean;
    tokens: TypeToken[];
    desc: string;
};
```

### Gen-side changes

**`scripts/lib/render-symbol-mdx.ts`**

- Add `typeToTokens(type: TypeDocType | undefined, index: SymbolIndex, ctx: ResolveContext): TypeToken[]`.
  Walk every TypeDoc type node:
  - `intrinsic` → `{ t: 'kw', text: name }`
  - `literal(null)` → `{ t: 'lit', text: 'null' }`
  - `literal(string)` → `{ t: 'lit', text: "'${value}'" }`
  - `literal(number/boolean)` → `{ t: 'lit', text: String(value) }`
  - `reference` → look up `name` via `resolveLink(index, name, ctx)`:
    - found → `{ t: 'ref', text: name, href: resolution.url }`
    - not found → `{ t: 'kw', text: name }`
    - generic args: wrap in `op('<')`, recurse, `op('>')`, joined by `op(', ')`
  - `array` → recurse elementType, append `op('[]')`
  - `union` → recurse each member, join with `op(' | ')`
  - `intersection` → recurse each member, join with `op(' & ')`
  - `reflection` (callable) → `op('(')` + params + `op(') => ')` + return tokens
  - `reflection` (object) → `op('{ ')` + prop pairs + `op(' }')`
  - all other kinds → `{ t: 'kw', text: typeToString(type) }` (fallback, single token)

- Replace `renderPropertiesTable(props)` with
  `renderPropertiesTable(props, index: SymbolIndex, ctx: ResolveContext)`:
  Build `PropRow[]`, JSON-serialize, emit:
  ```
  <PropsTable rows={JSON_LITERAL} />
  ```
  where `JSON_LITERAL` is the inline JSON object (not a string prop — pass as a JS
  expression using `{...}` so Next/MDX sees the real array, not a string).

- `SymbolRenderArgs` gains `symbolIndex: SymbolIndex`. Pass through to
  `renderShapeSections` → `renderPropertiesTable`.

**`scripts/emit-reference-mdx.ts`**

- Load `lib/symbol-index.generated.json` once at the top of `main()` (already written by
  stage-2 `buildSymbolIndex`).
- Build `ResolveContext` per symbol: `{ tab: 'reference', pkg: workspaceSlug, subpath }`.
- Pass `symbolIndex` in the `renderSymbolMdx(...)` call.

### Component: `components/reference/props-table.tsx`

`'use client'` — needs `useState` for the expand/collapse toggle.

**Props**:
```ts
type PropsTableProps = { rows: PropRow[] };
```

**Row ordering**: sort required (`opt: false`) before optional (`opt: true`) so the most
important props surface at the top. Within each group, preserve original declaration order.

**Layout** — `<div>` grid (not `<table>`), responsive:
- **`sm+`** — three columns: `grid-cols-[minmax(8rem,max-content)_minmax(0,1fr)_minmax(0,2fr)]`
- **`< sm`** — two rows per entry: row 1 spans name + type (`grid-cols-[max-content_1fr]`),
  row 2 is the description spanning full width. Achieved by wrapping each entry in a
  `<div>` that internally switches layout at `sm:`.

**Header row**: rendered above the data rows (always visible, not affected by threshold).
Three cells matching the column grid: `PROP`, `TYPE`, `DESCRIPTION` in
`font-mono text-[0.6rem] uppercase tracking-[0.16em] text-fg-dim`. Separated from data
rows by `border-b border-border-strong pb-2 mb-0`.

**Data rows**: `border-b border-border py-2.5 gap-x-4 hover:bg-bg-1 transition-colors duration-100`.
Last data row (`border-b` omitted or `border-transparent`) so the bottom of the table
doesn't double-border with the expand strip.

**Threshold**: 5 rows shown by default. Expand/collapse affordance shown only when
`rows.length > 5`.

The collapsed state has a gradient fade overlay over the last visible row to signal
truncation — an absolutely-positioned div `pointer-events-none` with
`bg-gradient-to-b from-transparent to-bg` covering the bottom ~40px of the rows wrapper.
The expand strip sits below this.

Expand strip (full-width, not a floating button):
```
border-t border-border bg-bg-1 px-0 py-2 text-center
font-mono text-[0.7rem] text-fg-mute hover:text-fg hover:bg-bg-2
transition-colors cursor-pointer select-none
```
- Collapsed: `Show {rows.length - 5} more ↓`
- Expanded: `Collapse ↑`

**Token rendering** — all tokens rendered inline in the type cell as a `flex flex-wrap gap-x-0.5 items-baseline` container so long union types wrap gracefully:
- `ref` → `<Link href={token.href}>` with `font-mono text-[0.84rem] text-brand hover:underline`
- `kw`  → `<span>` with `font-mono text-[0.84rem] text-fg`
- `lit` → `<code>` with `rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[0.8rem] text-fg`
  (styled like inline code elsewhere in the docs — no unique color, just the code-span treatment)
- `op`  → `<span>` with `font-mono text-[0.84rem] text-fg-mute`

**Name cell**: `font-mono font-semibold text-[0.84rem] text-fg`. Optional suffix
`<span className="text-fg-dim">?</span>` (dim, not muted, so it visually recedes further).
Add `min-w-0 overflow-hidden` to prevent overflow in narrow columns.

**Description cell**: `text-[0.85rem] text-fg-mute leading-snug`. Render as plain text.
Add `min-w-0` to prevent overflow.

**Empty state**: when `rows.length === 0`, render nothing (caller guards before emitting
`<PropsTable>`).

### Imports in MDX global component map

Add `PropsTable` to `apps/docs/mdx-components.tsx` (or wherever the global MDX component
map is defined — check `app/layout.tsx` or `next.config.mjs`).

---

## Part 2 — SourceFooter mobile fix

**File**: `components/reference/source-footer.tsx`

### Layout change

Replace `grid grid-cols-2 gap-6` with:
```
flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-6
```

Metadata `div` changes `items-end` → `items-start sm:items-end`.

### Progressive path truncation

Compute three strings from `file` (server-side, no client state):

```ts
const segs = file.split('/');
const filename = segs.at(-1) ?? file;
const short    = segs.length >= 3 ? segs.slice(-2).join('/') : file;
const full     = file;
```

Render three sibling `<span>`s in the source link `<a>`:

| Breakpoint | Span shown | Example |
|---|---|---|
| `< sm` | `filename` | `actions.ts` |
| `sm` – `lg` | `short` | `src/actions.ts` |
| `>= lg` | `full` | `react/src/actions.ts` |

Classes:
```tsx
<span className="sm:hidden">{filename}</span>
<span className="hidden sm:inline lg:hidden">{short}</span>
<span className="hidden lg:inline">{full}</span>
```

Add `max-w-full min-w-0 overflow-hidden` to the source link `<a>` so it cannot overflow
its grid column. Add `title={file}` to the `<a>` so the full path is always accessible
on hover regardless of truncation level.

Both grid column `<div>`s get `min-w-0` so grid items cannot blow out their tracks.

---

## Out of scope

- Nested object expansion within a type token (object reflection types render as a flat
  inline token sequence, not a sub-table).
- Enum members table — keep as-is (already a simple two-column table with no type cells).
- Type alias Definition codeblock — keep as-is (single codeblock + inline text for
  union/intersection types).

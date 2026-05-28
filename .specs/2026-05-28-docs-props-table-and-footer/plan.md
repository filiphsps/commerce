# PropsTable Visualizer + SourceFooter Mobile Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Markdown props table on reference pages with a collapsible, type-linked `<PropsTable>` component; make `SourceFooter` stack and truncate paths on mobile.

**Architecture:** TypeDoc type nodes are walked at gen time (`render-symbol-mdx.ts`) into a `TypeToken[]` array — references resolved against the pre-built symbol index, literals/keywords/operators encoded by kind. The array is JSON-serialised into a `<PropsTable rows={...} />` MDX call. At runtime the component renders tokens with correct colors and links, sorts required props first, and collapses past row 5 behind a full-width expand strip. `SourceFooter` changes are pure Tailwind: stack to `flex-col` below `sm:`, render three responsive `<span>` siblings for progressive path truncation.

**Tech Stack:** TypeScript, React 19, Next.js 16, Tailwind CSS 4, Vitest, MDX (Fumadocs).

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `apps/docs/lib/props-table-types.ts` | Shared `TypeToken` / `PropRow` types used by both gen scripts and the React component |
| **Modify** | `apps/docs/scripts/lib/render-symbol-mdx.ts` | Add `typeToTokens`, update `SymbolRenderArgs`, rewrite `renderPropertiesTable` |
| **Modify** | `apps/docs/scripts/emit-reference-mdx.ts` | Load `symbol-index.generated.json`, pass `symbolIndex` to `renderSymbolMdx` |
| **Create** | `apps/docs/components/reference/props-table.tsx` | Client component: renders `PropRow[]` with collapse/expand, header, responsive layout |
| **Modify** | `apps/docs/mdx-components.tsx` | Register `PropsTable` in the global MDX component map |
| **Modify** | `apps/docs/components/reference/source-footer.tsx` | Responsive stacking + progressive path truncation |
| **Modify** | `apps/docs/scripts/lib/render-symbol-mdx.test.ts` | Tests for `typeToTokens` and the new `renderPropertiesTable` output |

---

## Task 1 — Shared TypeToken / PropRow types

**Files:**
- Create: `apps/docs/lib/props-table-types.ts`

- [ ] **Create the types file**

```ts
// apps/docs/lib/props-table-types.ts

/**
 * A single visual unit in a rendered type expression. Produced at gen time
 * by `typeToTokens`; consumed at runtime by `<PropsTable>`.
 */
export type TypeToken =
    | { t: 'ref'; text: string; href: string }
    | { t: 'kw'; text: string }
    | { t: 'lit'; text: string }
    | { t: 'op'; text: string };

/**
 * One property row for `<PropsTable>`. Serialised into the MDX JSX expression
 * at gen time and hydrated by the component at runtime.
 */
export type PropRow = {
    name: string;
    opt: boolean;
    tokens: TypeToken[];
    desc: string;
};
```

- [ ] **Commit**

```bash
git add apps/docs/lib/props-table-types.ts
git commit -m "feat(docs): add PropRow/TypeToken shared types for PropsTable."
```

---

## Task 2 — `typeToTokens` in render-symbol-mdx.ts

**Files:**
- Modify: `apps/docs/scripts/lib/render-symbol-mdx.ts` (top of file + after `typeToString`)
- Modify: `apps/docs/scripts/lib/render-symbol-mdx.test.ts`

- [ ] **Add imports at the top of `render-symbol-mdx.ts`**

After the existing imports add:
```ts
import { isLinkableToken, resolveLink } from '../../lib/jsdoc-link-resolver';
import type { ResolveContext, SymbolIndex } from '../../lib/jsdoc-link-resolver';
import type { PropRow, TypeToken } from '../../lib/props-table-types';
```

- [ ] **Add `typeToTokens` after the `typeToString` function (after line ~437)**

```ts
/**
 * Walk a TypeDoc type node into a flat array of `TypeToken`s. Reference type
 * names are resolved against the symbol index — found entries become `ref`
 * tokens with a docs URL; unresolvable names fall back to `kw`. Literals,
 * keywords, and punctuation each carry their own discriminant so the runtime
 * component can apply the correct visual treatment without re-parsing.
 *
 * @param type - TypeDoc type node, or `undefined`.
 * @param index - Pre-built symbol index (from `lib/symbol-index.generated.json`).
 * @param ctx - Current page context for scoring ambiguous resolutions.
 * @returns Flat array of display tokens.
 */
function typeToTokens(
    type: TypeDocType | undefined,
    index: SymbolIndex,
    ctx: ResolveContext,
): TypeToken[] {
    const op = (text: string): TypeToken => ({ t: 'op', text });
    const kw = (text: string): TypeToken => ({ t: 'kw', text });

    if (!type) return [kw('unknown')];

    switch (type.type) {
        case 'intrinsic':
            return [kw(type.name ?? 'unknown')];

        case 'literal': {
            if (type.value === null) return [{ t: 'lit', text: 'null' }];
            if (typeof type.value === 'string') return [{ t: 'lit', text: `'${type.value}'` }];
            return [{ t: 'lit', text: String(type.value) }];
        }

        case 'reference': {
            const name = type.name ?? 'unknown';
            const resolution = isLinkableToken(name) ? resolveLink(index, name, ctx) : null;
            const head: TypeToken = resolution
                ? { t: 'ref', text: name, href: resolution.url }
                : kw(name);
            if (!type.typeArguments?.length) return [head];
            const argTokens: TypeToken[] = [];
            for (let i = 0; i < type.typeArguments.length; i++) {
                if (i > 0) argTokens.push(op(', '));
                argTokens.push(...typeToTokens(type.typeArguments[i], index, ctx));
            }
            return [head, op('<'), ...argTokens, op('>')];
        }

        case 'array':
            return [...typeToTokens(type.elementType, index, ctx), op('[]')];

        case 'union': {
            const members = type.types ?? [];
            const out: TypeToken[] = [];
            for (let i = 0; i < members.length; i++) {
                if (i > 0) out.push(op(' | '));
                out.push(...typeToTokens(members[i], index, ctx));
            }
            return out;
        }

        case 'intersection': {
            const members = type.types ?? [];
            const out: TypeToken[] = [];
            for (let i = 0; i < members.length; i++) {
                if (i > 0) out.push(op(' & '));
                out.push(...typeToTokens(members[i], index, ctx));
            }
            return out;
        }

        case 'reflection': {
            const decl = type.declaration;
            const sig = decl?.signatures?.[0];
            if (sig) {
                const params = sig.parameters ?? [];
                const paramTokens: TypeToken[] = [];
                for (let i = 0; i < params.length; i++) {
                    if (i > 0) paramTokens.push(op(', '));
                    const p = params[i];
                    if (!p) continue;
                    paramTokens.push(kw(p.name), op(': '), ...typeToTokens(p.type, index, ctx));
                }
                return [op('('), ...paramTokens, op(') => '), ...typeToTokens(sig.type, index, ctx)];
            }
            const children = decl?.children ?? [];
            if (children.length > 0) {
                const propTokens: TypeToken[] = [];
                for (let i = 0; i < children.length; i++) {
                    if (i > 0) propTokens.push(op('; '));
                    const c = children[i];
                    if (!c) continue;
                    propTokens.push(kw(c.name), op(': '), ...typeToTokens(c.type, index, ctx));
                }
                return [op('{ '), ...propTokens, op(' }')];
            }
            return [op('{}')];
        }

        case 'tuple': {
            const elems = type.elements ?? [];
            const out: TypeToken[] = [];
            for (let i = 0; i < elems.length; i++) {
                if (i > 0) out.push(op(', '));
                out.push(...typeToTokens(elems[i], index, ctx));
            }
            return [op('['), ...out, op(']')];
        }

        default:
            return [kw(typeToString(type))];
    }
}
```

- [ ] **Write tests for `typeToTokens` in `render-symbol-mdx.test.ts`**

The function is not exported — export it by adding `export` keyword: change
`function typeToTokens(` → `export function typeToTokens(`. Then add to the test file:

```ts
import { describe, expect, it } from 'vitest';
import { renderSymbolMdx, typeToTokens } from './render-symbol-mdx';
import { KIND_FUNCTION } from './typedoc-types';

describe('typeToTokens', () => {
    const emptyIndex = {};
    const ctx = { tab: 'reference' as const, pkg: 'cms', subpath: 'api' };

    it('intrinsic → kw token', () => {
        expect(typeToTokens({ type: 'intrinsic', name: 'string' }, emptyIndex, ctx)).toEqual([
            { t: 'kw', text: 'string' },
        ]);
    });

    it('string literal → lit token with quotes', () => {
        expect(typeToTokens({ type: 'literal', value: 'hello' }, emptyIndex, ctx)).toEqual([
            { t: 'lit', text: "'hello'" },
        ]);
    });

    it('null literal → lit token', () => {
        expect(typeToTokens({ type: 'literal', value: null }, emptyIndex, ctx)).toEqual([
            { t: 'lit', text: 'null' },
        ]);
    });

    it('numeric literal → lit token', () => {
        expect(typeToTokens({ type: 'literal', value: 42 }, emptyIndex, ctx)).toEqual([
            { t: 'lit', text: '42' },
        ]);
    });

    it('unresolvable reference → kw token', () => {
        expect(typeToTokens({ type: 'reference', name: 'UnknownType' }, emptyIndex, ctx)).toEqual([
            { t: 'kw', text: 'UnknownType' },
        ]);
    });

    it('resolvable reference → ref token with href', () => {
        const index = { Article: [{ url: '/reference/cms/api/article/', kind: 'interface' as const, tab: 'reference' as const, pkg: 'cms', subpath: 'api' }] };
        expect(typeToTokens({ type: 'reference', name: 'Article' }, index, ctx)).toEqual([
            { t: 'ref', text: 'Article', href: '/reference/cms/api/article/' },
        ]);
    });

    it('generic reference → ref + angle brackets + arg tokens', () => {
        const index = { Article: [{ url: '/reference/cms/api/article/', kind: 'interface' as const, tab: 'reference' as const, pkg: 'cms', subpath: 'api' }] };
        const result = typeToTokens(
            { type: 'reference', name: 'Article', typeArguments: [{ type: 'intrinsic', name: 'string' }] },
            index,
            ctx,
        );
        expect(result).toEqual([
            { t: 'ref', text: 'Article', href: '/reference/cms/api/article/' },
            { t: 'op', text: '<' },
            { t: 'kw', text: 'string' },
            { t: 'op', text: '>' },
        ]);
    });

    it('array type → element tokens + op("[]")', () => {
        expect(
            typeToTokens({ type: 'array', elementType: { type: 'intrinsic', name: 'number' } }, emptyIndex, ctx),
        ).toEqual([{ t: 'kw', text: 'number' }, { t: 'op', text: '[]' }]);
    });

    it('union type → members joined with op(" | ")', () => {
        expect(
            typeToTokens(
                { type: 'union', types: [{ type: 'intrinsic', name: 'string' }, { type: 'literal', value: null }] },
                emptyIndex,
                ctx,
            ),
        ).toEqual([
            { t: 'kw', text: 'string' },
            { t: 'op', text: ' | ' },
            { t: 'lit', text: 'null' },
        ]);
    });

    it('reflection (object) → braces + prop tokens', () => {
        expect(
            typeToTokens(
                {
                    type: 'reflection',
                    declaration: {
                        children: [
                            { name: 'id', type: { type: 'intrinsic', name: 'number' } },
                            { name: 'slug', type: { type: 'intrinsic', name: 'string' } },
                        ],
                    },
                },
                emptyIndex,
                ctx,
            ),
        ).toEqual([
            { t: 'op', text: '{ ' },
            { t: 'kw', text: 'id' },
            { t: 'op', text: ': ' },
            { t: 'kw', text: 'number' },
            { t: 'op', text: '; ' },
            { t: 'kw', text: 'slug' },
            { t: 'op', text: ': ' },
            { t: 'kw', text: 'string' },
            { t: 'op', text: ' }' },
        ]);
    });

    it('undefined type → kw("unknown")', () => {
        expect(typeToTokens(undefined, emptyIndex, ctx)).toEqual([{ t: 'kw', text: 'unknown' }]);
    });
});
```

- [ ] **Run tests to confirm they pass**

```bash
pnpm test --project @nordcom/commerce-docs
```

Expected: all tests pass (no snapshot changes — `typeToTokens` is new, the existing function snapshot is unaffected).

- [ ] **Commit**

```bash
git add apps/docs/scripts/lib/render-symbol-mdx.ts apps/docs/scripts/lib/render-symbol-mdx.test.ts
git commit -m "feat(docs): add typeToTokens — walks TypeDoc types into linked TypeToken arrays."
```

---

## Task 3 — Rewrite `renderPropertiesTable` + thread symbolIndex through call chain

**Files:**
- Modify: `apps/docs/scripts/lib/render-symbol-mdx.ts`

- [ ] **Update `SymbolRenderArgs` (around line 54) to carry the symbol index**

```ts
export type SymbolRenderArgs = {
    workspaceSlug: string;
    subpath: string;
    symbol: TypeDocSymbol;
    kind: SymbolKindLabel;
    /** Pre-built symbol index for resolving type links. Defaults to `{}` when omitted. */
    symbolIndex?: SymbolIndex;
    /** Names of other own-page symbols in the same subpath; used for the Related section. */
    siblings?: string[];
};
```

- [ ] **Update `renderSymbolMdx` to extract `symbolIndex` and build `ResolveContext`**

In `renderSymbolMdx` (around line 74), change the destructure at the top of the function:

```ts
export function renderSymbolMdx(args: SymbolRenderArgs): string {
    const { symbol, kind, workspaceSlug, subpath, siblings = [], symbolIndex = {} } = args;
    const ctx: ResolveContext = { tab: 'reference', pkg: workspaceSlug, subpath };
    // ... rest of function unchanged except one line below
```

Then find the `renderShapeSections` call (around line 112) and update it:
```ts
// before:
? renderShapeSections(symbol, kind, workspaceSlug)
// after:
? renderShapeSections(symbol, kind, workspaceSlug, symbolIndex, ctx)
```

- [ ] **Update `renderShapeSections` signature (line 155)**

```ts
function renderShapeSections(
    symbol: TypeDocSymbol,
    kind: SymbolKindLabel,
    workspaceSlug: string,
    index: SymbolIndex,
    ctx: ResolveContext,
): string[] {
    if (kind === 'enum') {
        return ['## Members', '', renderEnumMembersTable(symbol)];
    }

    const props = collectProperties(symbol);
    const sections: string[] = [];

    if (props.length > 0) {
        sections.push('## Properties', '', renderPropertiesTable(props, index, ctx));
    } else {
        const sig = renderTypeAliasDefinition(symbol, workspaceSlug);
        if (sig) sections.push('## Definition', '', sig);
    }
    return sections;
}
```

- [ ] **Replace `renderPropertiesTable` (starting line 199)**

Delete the entire existing function and replace with:

```ts
/**
 * Emit a `<PropsTable>` MDX component call for an interface or object-typed type
 * alias. Each property is serialised to a `PropRow` with `TypeToken[]` built by
 * `typeToTokens` — reference names are resolved to docs URLs via the symbol index.
 *
 * @param props - Collected property descriptors from `collectProperties`.
 * @param index - Pre-built symbol index for link resolution.
 * @param ctx - Current page context for resolution scoring.
 * @returns MDX component string with trailing newline.
 */
function renderPropertiesTable(
    props: Array<{
        name: string;
        type?: TypeDocType;
        comment?: { summary?: TypeDocCommentNode[] };
        flags?: { isOptional?: boolean };
    }>,
    index: SymbolIndex,
    ctx: ResolveContext,
): string {
    const rows: PropRow[] = props.map((p) => ({
        name: p.name,
        opt: p.flags?.isOptional ?? false,
        tokens: typeToTokens(p.type, index, ctx),
        desc: plainText(p.comment?.summary ?? []),
    }));
    return `<PropsTable rows={${JSON.stringify(rows)}} />\n`;
}
```

- [ ] **Add a test for the new `renderPropertiesTable` output**

Export the function for testing: change `function renderPropertiesTable(` → `export function renderPropertiesTable(`.

Add to `render-symbol-mdx.test.ts`:

```ts
import { renderPropertiesTable, renderSymbolMdx, typeToTokens } from './render-symbol-mdx';
// ...existing imports...

describe('renderPropertiesTable', () => {
    const emptyIndex = {};
    const ctx = { tab: 'reference' as const, pkg: 'cms', subpath: 'api' };

    it('emits <PropsTable> with serialised rows', () => {
        const output = renderPropertiesTable(
            [
                {
                    name: 'slug',
                    type: { type: 'intrinsic', name: 'string' },
                    comment: { summary: [{ kind: 'text', text: 'The article slug.' }] },
                    flags: { isOptional: false },
                },
                {
                    name: 'locale',
                    type: { type: 'intrinsic', name: 'string' },
                    comment: { summary: [{ kind: 'text', text: 'BCP-47 locale tag.' }] },
                    flags: { isOptional: true },
                },
            ],
            emptyIndex,
            ctx,
        );
        expect(output).toMatch(/^<PropsTable rows=\{/);
        expect(output).toContain('"name":"slug"');
        expect(output).toContain('"opt":false');
        expect(output).toContain('"name":"locale"');
        expect(output).toContain('"opt":true');
        expect(output).toContain('"t":"kw","text":"string"');
        expect(output).toContain('"desc":"The article slug."');
    });

    it('resolves reference types to ref tokens', () => {
        const index = {
            Shop: [{ url: '/reference/cms/api/shop/', kind: 'interface' as const, tab: 'reference' as const, pkg: 'cms', subpath: 'api' }],
        };
        const output = renderPropertiesTable(
            [{ name: 'shop', type: { type: 'reference', name: 'Shop' }, flags: {} }],
            index,
            ctx,
        );
        expect(output).toContain('"t":"ref"');
        expect(output).toContain('"href":"/reference/cms/api/shop/"');
    });
});
```

- [ ] **Run tests**

```bash
pnpm test --project @nordcom/commerce-docs
```

Expected: all tests pass. The existing `renderSymbolMdx` snapshot is unaffected because function symbols never call `renderPropertiesTable`.

- [ ] **Commit**

```bash
git add apps/docs/scripts/lib/render-symbol-mdx.ts apps/docs/scripts/lib/render-symbol-mdx.test.ts
git commit -m "feat(docs): rewrite renderPropertiesTable to emit <PropsTable> with token-linked types."
```

---

## Task 4 — Load symbol index in `emit-reference-mdx.ts`

**Files:**
- Modify: `apps/docs/scripts/emit-reference-mdx.ts`

- [ ] **Add import and load the index in `main()`**

Add to imports at the top of the file:
```ts
import type { SymbolIndex } from '../lib/jsdoc-link-resolver';
```

At the very start of the `main()` function body (before `fs.mkdirSync`), add:
```ts
const symbolIndex: SymbolIndex = JSON.parse(
    fs.readFileSync(path.join(DOCS_APP, 'lib/symbol-index.generated.json'), 'utf8'),
) as SymbolIndex;
```

- [ ] **Pass `symbolIndex` to `renderSymbolMdx`**

Find the `renderSymbolMdx({...})` call (around line 108) and add `symbolIndex`:

```ts
const mdx = renderSymbolMdx({
    workspaceSlug,
    subpath: subpathRel === 'index' ? 'index' : subpathRel,
    symbol,
    kind: row.kind,
    siblings: ownPageSiblings,
    symbolIndex,
});
```

- [ ] **Commit**

```bash
git add apps/docs/scripts/emit-reference-mdx.ts
git commit -m "feat(docs): pass symbol index to renderSymbolMdx for type link resolution."
```

---

## Task 5 — `<PropsTable>` React component

**Files:**
- Create: `apps/docs/components/reference/props-table.tsx`

- [ ] **Create the component**

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PropRow, TypeToken } from '../../lib/props-table-types';

const THRESHOLD = 5;

type PropsTableProps = { rows: PropRow[] };

/**
 * Collapsible properties table for reference pages. Sorts required props before
 * optional ones, shows the first `THRESHOLD` rows by default, and reveals the
 * rest behind a full-width expand strip. Type tokens are pre-resolved at gen
 * time — references render as brand-coloured links, literals as code spans,
 * keywords and operators as plain mono text.
 *
 * @param props - Serialised prop rows from the MDX gen script.
 * @returns The properties table, or null when `rows` is empty.
 */
export function PropsTable({ rows }: PropsTableProps) {
    const [expanded, setExpanded] = useState(false);

    if (rows.length === 0) return null;

    const sorted = [...rows].sort((a, b) => {
        if (a.opt === b.opt) return 0;
        return a.opt ? 1 : -1;
    });

    const visible = expanded ? sorted : sorted.slice(0, THRESHOLD);
    const hasMore = sorted.length > THRESHOLD;
    const hiddenCount = sorted.length - THRESHOLD;

    return (
        <div className="not-prose mb-4">
            {/* Column headers — hidden on mobile, shown sm+ */}
            <div className="hidden sm:grid sm:grid-cols-[minmax(8rem,max-content)_minmax(0,1fr)_minmax(0,2fr)] gap-x-4 border-b border-border-strong pb-2">
                {(['PROP', 'TYPE', 'DESCRIPTION'] as const).map((label) => (
                    <span key={label} className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-fg-dim">
                        {label}
                    </span>
                ))}
            </div>

            {/* Rows + gradient fade wrapper */}
            <div className="relative">
                {visible.map((row, i) => (
                    <PropRowItem key={row.name} row={row} isLast={i === visible.length - 1} />
                ))}

                {hasMore && !expanded && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-bg"
                    />
                )}
            </div>

            {/* Full-width expand strip */}
            {hasMore && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="w-full border-t border-border bg-bg-1 py-2 text-center font-mono text-[0.7rem] text-fg-mute transition-colors duration-100 hover:bg-bg-2 hover:text-fg cursor-pointer select-none"
                >
                    {expanded ? 'Collapse ↑' : `Show ${hiddenCount} more ↓`}
                </button>
            )}
        </div>
    );
}

/**
 * Single property row. On `sm+` it uses a 3-column grid; on mobile it stacks
 * into two rows: name + type on row 1, description spanning full width on row 2.
 *
 * @param props - The row data and whether this is the last visible row.
 * @returns A grid row div.
 */
function PropRowItem({ row, isLast }: { row: PropRow; isLast: boolean }) {
    return (
        <div
            className={`group grid grid-cols-[max-content_1fr] sm:grid-cols-[minmax(8rem,max-content)_minmax(0,1fr)_minmax(0,2fr)] gap-x-4 py-2.5 transition-colors duration-100 hover:bg-bg-1${isLast ? '' : ' border-b border-border'}`}
        >
            {/* Name */}
            <div className="min-w-0 overflow-hidden py-0.5 self-start">
                <span className="font-mono font-semibold text-[0.84rem] text-fg">{row.name}</span>
                {row.opt && <span className="font-mono text-[0.84rem] text-fg-dim">?</span>}
            </div>

            {/* Type tokens */}
            <div className="flex flex-wrap gap-x-0.5 items-baseline min-w-0 py-0.5 self-start">
                {row.tokens.map((token, i) => (
                    <TokenSpan key={i} token={token} />
                ))}
            </div>

            {/* Description — col-span-2 on mobile so it wraps to its own row */}
            <div className="col-span-2 sm:col-span-1 min-w-0 py-0.5 text-[0.85rem] text-fg-mute leading-snug">
                {row.desc || null}
            </div>
        </div>
    );
}

/**
 * Render a single type token as the appropriate inline element.
 * `ref` → brand-coloured link; `kw` → plain mono span; `lit` → code span
 * with subtle background (consistent with inline code elsewhere); `op` → dim mono.
 *
 * @param props - The token to render.
 * @returns An inline element.
 */
function TokenSpan({ token }: { token: TypeToken }) {
    switch (token.t) {
        case 'ref':
            return (
                <Link href={token.href} className="font-mono text-[0.84rem] text-brand hover:underline">
                    {token.text}
                </Link>
            );
        case 'kw':
            return <span className="font-mono text-[0.84rem] text-fg">{token.text}</span>;
        case 'lit':
            return (
                <code className="rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[0.8rem] text-fg">
                    {token.text}
                </code>
            );
        case 'op':
            return <span className="font-mono text-[0.84rem] text-fg-mute">{token.text}</span>;
    }
}
```

- [ ] **Commit**

```bash
git add apps/docs/components/reference/props-table.tsx
git commit -m "feat(docs): add PropsTable component — collapsible, token-linked, responsive."
```

---

## Task 6 — Register PropsTable in the MDX component map

**Files:**
- Modify: `apps/docs/mdx-components.tsx`

- [ ] **Add import and registration**

Add import after the existing reference component imports:
```ts
import { PropsTable } from './components/reference/props-table';
```

Add `PropsTable` to the returned object in `getMDXComponents`:
```ts
PropsTable,
```
Place it after `ThrowsBlock, ThrowsRow,` (line ~49 area) to keep reference components grouped.

- [ ] **Commit**

```bash
git add apps/docs/mdx-components.tsx
git commit -m "feat(docs): register PropsTable in the MDX component map."
```

---

## Task 7 — SourceFooter mobile fix

**Files:**
- Modify: `apps/docs/components/reference/source-footer.tsx`

- [ ] **Rewrite the component**

Replace the entire file content:

```tsx
import Link from 'next/link';

type SourceFooterProps = {
    /** Repo-relative source file path. */
    file: string;
    /** Line number of the symbol. */
    line: number;
    /** GitHub blob URL anchored to the symbol's line. */
    href: string;
    /** Workspace package name (`@nordcom/commerce-cms`) for the version chip. */
    pkg?: string;
    /** Workspace package version (e.g. `0.1.0`). */
    version?: string;
};

/**
 * Footer for generated reference pages. Stacks to a single column on mobile
 * and switches to a two-column grid on `sm+`. The source file path is
 * progressively truncated: filename-only below `sm`, two-segment below `lg`,
 * full path at `lg+`. Both columns carry `min-w-0` so long strings cannot
 * escape their grid tracks.
 *
 * @param props - File, line, GitHub href, and optional pkg/version.
 * @returns A responsive footer div.
 */
export function SourceFooter({ file, line, href, pkg, version }: SourceFooterProps) {
    const segs = file.split('/');
    const filename = segs.at(-1) ?? file;
    const short = segs.length >= 3 ? segs.slice(-2).join('/') : file;

    return (
        <div className="not-prose mt-12 flex flex-col gap-4 border-border border-t-[0.138rem] pt-6 sm:grid sm:grid-cols-2 sm:gap-6">
            {/* Source */}
            <div className="flex min-w-0 flex-col gap-1.5">
                <span className="font-mono text-[0.6rem] text-fg-dim uppercase tracking-[0.16em]">Source</span>
                <a
                    href={href}
                    title={file}
                    className="inline-flex max-w-full min-w-0 overflow-hidden w-fit items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border bg-bg-1 px-2.5 py-1.5 font-mono text-[0.78rem] text-fg no-underline transition-colors duration-150 hover:border-brand hover:bg-brand/5 hover:text-brand"
                >
                    <span className="sm:hidden">{filename}</span>
                    <span className="hidden sm:inline lg:hidden">{short}</span>
                    <span className="hidden lg:inline">{file}</span>
                    <span className="text-fg-mute">:{line}</span>
                    <span className="ms-1">↗</span>
                </a>
                <span className="font-mono text-[0.7rem] text-fg-mute">Edit the JSDoc directly</span>
            </div>

            {/* Metadata */}
            <div className="flex min-w-0 flex-col items-start gap-1.5 sm:items-end">
                <span className="font-mono text-[0.6rem] text-fg-dim uppercase tracking-[0.16em]">Metadata</span>
                {pkg && version ? (
                    <span className="rounded-[3px] border border-pkg/40 bg-pkg/10 px-1.5 py-0.5 font-mono text-[0.66rem] text-pkg">
                        {pkg}@{version}
                    </span>
                ) : null}
                <a
                    href={href}
                    className="inline-flex w-fit items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border px-2.5 py-1.5 font-mono text-[0.7rem] text-fg no-underline transition-colors duration-150 hover:border-brand hover:bg-brand/10 hover:text-brand"
                >
                    Open in GitHub ↗
                </a>
            </div>
        </div>
    );
}
```

- [ ] **Commit**

```bash
git add apps/docs/components/reference/source-footer.tsx
git commit -m "fix(docs): make SourceFooter responsive — stack on mobile, progressively truncate path."
```

---

## Task 8 — Regenerate reference MDX and verify end-to-end

**Files:**
- Generated: `apps/docs/content/reference/**/*.mdx` (many files touched by gen script)

- [ ] **Run the full docs gen pipeline**

```bash
pnpm --filter @nordcom/commerce-docs gen
```

Expected output: `[gen] complete in Xms` with no errors. The gen now writes `<PropsTable rows={...} />` instead of Markdown tables in every interface/type MDX file.

- [ ] **Run tests**

```bash
pnpm test --project @nordcom/commerce-docs
```

Expected: all tests pass.

- [ ] **Run typecheck**

```bash
pnpm --filter @nordcom/commerce-docs typecheck
```

Expected: no errors.

- [ ] **Update snapshots if needed**

If the existing `renderSymbolMdx` snapshot is stale (it shouldn't be — function symbols are unaffected), update it:
```bash
pnpm --filter @nordcom/commerce-docs test -- --update-snapshots
```

Then review the diff to confirm only expected changes.

- [ ] **Commit generated files**

```bash
git add apps/docs/content/reference
git commit -m "chore(docs): regenerate reference MDX with PropsTable type-linked tables."
```

---

## Task 9 — Lint and final commit

- [ ] **Run lint**

```bash
pnpm --filter @nordcom/commerce-docs lint
```

Fix any Biome errors (unused imports, formatting). Common issues:
- `import type` required for type-only imports (Biome `useImportType` rule)
- Trailing commas, semicolons, 4-space indent

- [ ] **Push**

```bash
git push
```

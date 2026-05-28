import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ResolveContext, SymbolIndex } from '../../lib/jsdoc-link-resolver';
import { resolveLink } from '../../lib/jsdoc-link-resolver';
import type { PropRow, TypeToken } from '../../lib/props-table-types';
import type { SymbolKindLabel } from './symbol-classify';
import type { TypeDocComment, TypeDocCommentNode, TypeDocSymbol, TypeDocType } from './typedoc-types';

const GITHUB_BASE = 'https://github.com/filiphsps/commerce/blob/master';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');

/** In-process cache: workspace slug → package.json version, or `''` when unknown. */
const versionCache = new Map<string, string>();

/**
 * Look up a workspace's `package.json` version. The TypeDoc workspace slug is
 * the top-level folder (e.g. `cart`) but for sub-workspaces (`cart/react`,
 * `cart/core`) the version lives in the sub-folder's package.json — derive
 * the real package directory from the symbol's source `fileName` when
 * present, falling back to the bare slug.
 *
 * @param slug - Top-level workspace slug (`'cart'`, `'cms'`).
 * @param fileName - Source file path relative to the workspace (e.g. `'react/src/hooks.ts'`).
 * @returns The package.json version, or `''` when unresolvable.
 */
function workspaceVersion(slug: string, fileName?: string): string {
    const cacheKey = `${slug}::${fileName ?? ''}`;
    const cached = versionCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Build candidate package roots: prefer the nested sub-workspace
    // (e.g. `cart/react`) before falling back to the bare slug.
    const candidates: string[] = [];
    if (fileName) {
        const firstSeg = fileName.split('/')[0];
        if (firstSeg) candidates.push(`${slug}/${firstSeg}`);
    }
    candidates.push(slug);

    for (const candidate of candidates) {
        for (const parent of ['packages', 'apps']) {
            const pkgFile = path.join(REPO_ROOT, parent, candidate, 'package.json');
            if (fs.existsSync(pkgFile)) {
                const { version } = JSON.parse(fs.readFileSync(pkgFile, 'utf8')) as { version?: string };
                const v = version ?? '';
                versionCache.set(cacheKey, v);
                return v;
            }
        }
    }
    versionCache.set(cacheKey, '');
    return '';
}

export type SymbolRenderArgs = {
    workspaceSlug: string;
    subpath: string;
    symbol: TypeDocSymbol;
    kind: SymbolKindLabel;
    /** Pre-built symbol index; when present, type references in PropsTable are linked. */
    symbolIndex?: SymbolIndex;
    /** Names of other own-page symbols in the same subpath; used for the Related section. */
    siblings?: string[];
};

/**
 * Emit an MDX page for a single exported symbol — function, class, component,
 * interface, type alias, or enum. Sections vary by kind: functions render
 * signature + params + returns + throws; interfaces render a properties
 * table; type aliases render a one-line type expression; enums render a
 * members table. Banners, h1, kind-line, summary, example, see-also, and
 * source footer are shared across all kinds. Matches visuals/02 layout.
 *
 * @param args - Workspace, subpath, symbol, and resolved kind label.
 * @returns The full MDX file body (frontmatter included).
 */
export function renderSymbolMdx(args: SymbolRenderArgs): string {
    const { symbol, kind, workspaceSlug, subpath, siblings = [], symbolIndex = {} } = args;
    const rawNodes = symbol.comment?.summary ?? symbol.signatures?.[0]?.comment?.summary;
    const summary = renderCommentInlineMd(rawNodes);
    const descriptionText = plainSummary(rawCommentText(rawNodes));
    const blockTags = symbol.comment?.blockTags ?? symbol.signatures?.[0]?.comment?.blockTags ?? [];
    const modifierTags = symbol.comment?.modifierTags ?? symbol.signatures?.[0]?.comment?.modifierTags ?? [];

    const frontmatter = [
        '---',
        `title: ${symbol.name}`,
        `description: "${escapeYaml(descriptionText)}"`,
        `---`,
        '',
    ].join('\n');

    const banner = renderTagBanner(modifierTags, blockTags);
    const example = renderExample(blockTags);
    const seeAlso = renderSeeAlso(blockTags);
    const related = renderRelated(symbol.name, siblings);
    const source = renderSource(symbol, workspaceSlug);

    const src = symbol.sources?.[0];
    const srcUrl = src?.url ?? (src ? `${GITHUB_BASE}/${src.fileName}#L${src.line}` : '');
    const emptyJSDoc = !summary && srcUrl ? `<EmptyJSDoc href="${srcUrl}" />` : '';

    const header = [
        frontmatter,
        banner,
        `<SymbolTitle name="${symbol.name}" />`,
        renderKindLine(kind, workspaceSlug, subpath, symbol, blockTags),
        '',
        emptyJSDoc || summary,
        '',
    ];

    const ctx: ResolveContext = { tab: 'reference', pkg: workspaceSlug, subpath };

    const body =
        kind === 'interface' || kind === 'type' || kind === 'enum'
            ? renderShapeSections(symbol, kind, workspaceSlug, symbolIndex, ctx)
            : [
                  '## Signature',
                  '',
                  renderSignatureWithTitle(workspaceSlug, renderSignature(symbol)),
                  renderParams(symbol, blockTags),
                  renderReturns(blockTags),
                  renderThrows(blockTags),
              ];

    return [...header, ...body, example, seeAlso, related, source].filter(Boolean).join('\n');
}

/**
 * Render a `## Related` section as inline-code chips of sibling symbols.
 * `remarkLinkSymbols` upgrades each token into an anchor whose `data-symbol-tab`
 * paints the reference-neon pill. Drops the current symbol from the list and
 * limits to a tidy 8 chips so the section stays scannable. Returns empty when
 * the subpath has no other own-page siblings.
 *
 * @param current - The current symbol's name (excluded from the chip set).
 * @param siblings - All own-page symbol names in the same subpath.
 * @returns Markdown section string, or empty string when nothing to link.
 */
function renderRelated(current: string, siblings: string[]): string {
    const others = siblings.filter((s) => s !== current).slice(0, 8);
    if (others.length === 0) return '';
    const chips = others.map((s) => `\`${s}\``).join(' ');
    return ['## Related', '', chips, ''].join('\n');
}

/**
 * Render the body sections for a type/interface/enum symbol. Interfaces and
 * type-aliases (when the resolved type is an object reflection) get a
 * Properties table with clickable type names. Enums get a Members table.
 * Plain type aliases (unions, intersections, etc.) get a one-line Definition
 * codeblock followed by the raw inline type for clickability.
 *
 * @param symbol - The symbol to render.
 * @param kind - Resolved kind label.
 * @param workspaceSlug - Workspace folder slug used in the codeblock title.
 * @returns Array of body-section strings to be `.filter(Boolean).join('\n')`d.
 */
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

/**
 * Collect the directly-declared properties of an interface or object-typed
 * type alias. For interfaces, properties live on `symbol.children`. For
 * type aliases whose `type` is a reflection with a declaration that has
 * children, those children are the properties. Returns an empty array for
 * any other shape (union, intersection, intrinsic, etc.).
 *
 * @param symbol - The symbol to inspect.
 * @returns Array of property descriptors, possibly empty.
 */
function collectProperties(
    symbol: TypeDocSymbol,
): Array<{ name: string; type?: TypeDocType; comment?: TypeDocComment; flags?: TypeDocSymbol['flags'] }> {
    if (symbol.children?.length) return symbol.children;
    const t = symbol.type;
    if (t?.type === 'reflection' && t.declaration?.children?.length) return t.declaration.children;
    return [];
}

/**
 * Walk a TypeDoc type node into an array of `TypeToken`s. References are
 * resolved against the symbol index at gen time so the component can render
 * links without a remark plugin.
 *
 * @param type - The TypeDoc type node, or `undefined`.
 * @param index - Pre-built symbol index for reference resolution.
 * @param ctx - Resolution context (tab, pkg, subpath).
 * @returns Flat array of typed tokens representing the type expression.
 */
export function typeToTokens(type: TypeDocType | undefined, index: SymbolIndex, ctx: ResolveContext): TypeToken[] {
    if (!type) return [{ t: 'kw', text: 'unknown' }];
    const kw = (text: string): TypeToken => ({ t: 'kw', text });
    const op = (text: string): TypeToken => ({ t: 'op', text });
    const lit = (text: string): TypeToken => ({ t: 'lit', text });

    switch (type.type) {
        case 'intrinsic':
            return [kw(type.name ?? 'unknown')];
        case 'literal': {
            if (type.value === null) return [lit('null')];
            if (typeof type.value === 'string') return [lit(`'${type.value}'`)];
            return [lit(String(type.value))];
        }
        case 'reference': {
            const name = type.name ?? 'unknown';
            const resolution = resolveLink(index, name, ctx);
            const base: TypeToken = resolution ? { t: 'ref', text: name, href: resolution.url } : kw(name);
            const args = type.typeArguments;
            if (!args || args.length === 0) return [base];
            const tokens: TypeToken[] = [base, op('<')];
            for (let i = 0; i < args.length; i++) {
                if (i > 0) tokens.push(op(', '));
                const arg = args[i];
                if (arg) tokens.push(...typeToTokens(arg, index, ctx));
            }
            tokens.push(op('>'));
            return tokens;
        }
        case 'array': {
            const inner = typeToTokens(type.elementType, index, ctx);
            // Wrap union/intersection element types in parens so `(A | B)[]` is unambiguous.
            const needsParens = type.elementType?.type === 'union' || type.elementType?.type === 'intersection';
            if (needsParens) return [op('('), ...inner, op(')[]')];
            return [...inner, op('[]')];
        }
        case 'union': {
            const members = type.types ?? [];
            const tokens: TypeToken[] = [];
            for (let i = 0; i < members.length; i++) {
                if (i > 0) tokens.push(op(' | '));
                const m = members[i];
                if (m) tokens.push(...typeToTokens(m, index, ctx));
            }
            return tokens;
        }
        case 'intersection': {
            const members = type.types ?? [];
            const tokens: TypeToken[] = [];
            for (let i = 0; i < members.length; i++) {
                if (i > 0) tokens.push(op(' & '));
                const m = members[i];
                if (m) tokens.push(...typeToTokens(m, index, ctx));
            }
            return tokens;
        }
        case 'reflection': {
            const decl = type.declaration;
            const sig = decl?.signatures?.[0];
            if (sig) {
                const params = sig.parameters ?? [];
                const tokens: TypeToken[] = [op('(')];
                for (let i = 0; i < params.length; i++) {
                    if (i > 0) tokens.push(op(', '));
                    const p = params[i];
                    if (p) {
                        tokens.push(kw(p.name), op(': '), ...typeToTokens(p.type, index, ctx));
                    }
                }
                tokens.push(op(') => '), ...typeToTokens(sig.type, index, ctx));
                return tokens;
            }
            if (decl?.children?.length) {
                const children = decl.children;
                const tokens: TypeToken[] = [op('{ ')];
                for (let i = 0; i < children.length; i++) {
                    if (i > 0) tokens.push(op('; '));
                    const c = children[i];
                    if (c) {
                        tokens.push(kw(c.name), op(': '), ...typeToTokens(c.type, index, ctx));
                    }
                }
                tokens.push(op(' }'));
                return tokens;
            }
            return [op('{}')];
        }
        case 'tuple': {
            const elements = type.elements ?? [];
            const tokens: TypeToken[] = [op('[')];
            for (let i = 0; i < elements.length; i++) {
                if (i > 0) tokens.push(op(', '));
                const el = elements[i];
                if (el) tokens.push(...typeToTokens(el, index, ctx));
            }
            tokens.push(op(']'));
            return tokens;
        }
        default:
            return [kw(typeToString(type))];
    }
}

/**
 * Render a `<PropsTable>` MDX component call for an interface or object-shaped
 * type alias. Each row carries the property name, optional flag, type tokens
 * (with pre-resolved reference links), and a JSDoc summary.
 *
 * @param props - The collected property descriptors.
 * @param index - Symbol index for resolving type references to doc URLs.
 * @param ctx - Resolution context for the current symbol.
 * @returns MDX JSX expression string with trailing newline.
 */
function renderPropertiesTable(
    props: {
        name: string;
        type?: TypeDocType;
        comment?: { summary?: TypeDocCommentNode[] };
        flags?: { isOptional?: boolean };
    }[],
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

/**
 * Render the canonical `type Name = …` codeblock for a type alias whose
 * resolved type cannot be expressed as a properties table (unions,
 * intersections, intrinsics, references, conditionals, etc.). The codeblock
 * is followed by a clickable inline rendering of the type, so component
 * names within composite types resolve to their reference pages.
 *
 * @param symbol - Type-alias symbol.
 * @param workspaceSlug - Workspace folder slug for the codeblock title.
 * @returns The Definition section body, or empty string when no type info.
 */
function renderTypeAliasDefinition(symbol: TypeDocSymbol, workspaceSlug: string): string {
    if (!symbol.type) return '';
    const pkgName = `@nordcom/commerce-${workspaceSlug}`;
    const code = `type ${symbol.name} = ${typeToString(symbol.type)};`;
    const inline = escapeMdxAngles(typeToInlineMdRaw(symbol.type));
    return ['```ts title="' + pkgName + '"', code, '```', '', inline, ''].join('\n');
}

/**
 * Escape characters that would make MDX try to parse JSX or JS expressions
 * out of a type expression rendered as flowing text. `<…>` looks like a
 * tag; `{…}` looks like an embedded expression. Both must be escaped before
 * emitting an inline type expression into an MDX paragraph.
 *
 * @param s - Raw inline-MD type expression.
 * @returns Same string with MDX-special characters escaped.
 */
function escapeMdxAngles(s: string): string {
    return s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

/**
 * Render an enum's members as a Markdown table. Each member contributes a
 * row with its name and literal value (quoted when string, raw when numeric).
 * Enums without literal values show an em-dash placeholder.
 *
 * @param symbol - Enum symbol with `children` of kind=Member.
 * @returns Markdown table string with trailing newline.
 */
function renderEnumMembersTable(symbol: TypeDocSymbol): string {
    const members = symbol.children ?? [];
    if (members.length === 0) return '';
    const rows = members.map((m) => {
        const t = m.type;
        const val = t?.type === 'literal' ? (typeof t.value === 'string' ? `\`'${t.value}'\`` : `\`${t.value}\``) : '—';
        const desc = plainText(m.comment?.summary ?? []);
        return `| \`${m.name}\` | ${val} | ${desc} |`;
    });
    return ['| Member | Value | Description |', '|---|---|---|', ...rows, ''].join('\n');
}

/**
 * Wrap signature codeblocks with a `title="<package>"` meta so the renderer
 * shows the package path in the codeblock's title bar.
 *
 * @param workspaceSlug - Workspace folder slug under `apps/` or `packages/`.
 * @param sigBlock - The signature codeblock string from `renderSignature`.
 * @returns The same blocks with the title attribute injected.
 */
function renderSignatureWithTitle(workspaceSlug: string, sigBlock: string): string {
    if (!sigBlock) return '';
    const pkgName = `@nordcom/commerce-${workspaceSlug}`;
    return sigBlock.replace(/^```ts\b/gm, `\`\`\`ts title="${pkgName}"`);
}

/**
 * Emit a banner component for deprecated, beta, or experimental symbols.
 * Only the first applicable tag is rendered — `@deprecated` takes precedence.
 *
 * @param modifierTags - Modifier tags from the symbol comment.
 * @param blockTags - Block tags from the symbol comment.
 * @returns MDX component string, or empty string when no tag applies.
 */
function renderTagBanner(modifierTags: string[], blockTags: { tag: string; content: TypeDocCommentNode[] }[]): string {
    const deprecated = blockTags.find((t) => t.tag === '@deprecated');
    if (deprecated) {
        return `<DeprecatedBanner>${renderCommentInlineMd(deprecated.content)}</DeprecatedBanner>\n`;
    }
    if (modifierTags.includes('@beta')) return `<BetaBanner />\n`;
    if (modifierTags.includes('@experimental')) return `<ExperimentalBanner />\n`;
    return '';
}

/**
 * Render the `<KindLine>` MDX component that shows the symbol's kind, package
 * path, and optional async / throws-classname / returns-nullable tags. The
 * latter three are derived from the first signature's return type and the
 * `@throws` block tag content.
 *
 * @param kind - Normalised kind label.
 * @param slug - Workspace slug.
 * @param subpath - Subpath export key.
 * @param symbol - TypeDoc symbol providing the return type for async/null detection.
 * @param blockTags - Block tags used to detect `@throws` and its class name.
 * @returns MDX component string.
 */
function renderKindLine(
    kind: SymbolKindLabel,
    slug: string,
    subpath: string,
    symbol: TypeDocSymbol,
    blockTags: { tag: string; content: TypeDocCommentNode[] }[],
): string {
    const sig = symbol.signatures?.[0];
    const returnTypeName = sig?.type?.name ?? '';
    const isAsync = returnTypeName === 'Promise' || returnTypeName.startsWith('Promise<');
    const returnsNullable = /\bnull\b|\bundefined\b/.test(returnTypeName);

    const firstThrows = blockTags.find((t) => t.tag === '@throws');
    let throwsClass = '';
    if (firstThrows) {
        const text = firstThrows.content.map((n) => ('text' in n ? n.text : '')).join('');
        const m = text.match(/^[\s`{]*(\w+)/);
        throwsClass = m?.[1] ?? '';
    }

    const props = [`kind="${kind}"`, `path="${slug}/${subpath}"`];
    if (isAsync) props.push('isAsync');
    if (throwsClass) props.push(`throws="${throwsClass}"`);
    if (returnsNullable) props.push('returnsNullable');
    return `<KindLine ${props.join(' ')} />`;
}

/**
 * Emit one TypeScript codeblock per overload signature. Overloads naturally
 * stack by iterating `symbol.signatures`.
 *
 * @param symbol - The TypeDoc symbol to render signatures for.
 * @returns Markdown codeblock string, or empty string when no signatures are present.
 */
function renderSignature(symbol: TypeDocSymbol): string {
    const sigs = symbol.signatures ?? [];
    if (sigs.length === 0) return '';
    const blocks = sigs.map((s) => `\`\`\`ts\n${symbolToSignatureText(symbol.name, s)}\n\`\`\``);
    return blocks.join('\n\n');
}

/**
 * Produce a TypeScript signature text for a single signature reflection. Type
 * shapes go through `typeToString` so unions, intersections, generics,
 * anonymous object types and callables render in their real TS form instead
 * of collapsing to `unknown`.
 *
 * @param name - Symbol name (function name).
 * @param sig - Single signature reflection.
 * @returns One-line TypeScript function signature string.
 */
function symbolToSignatureText(
    name: string,
    sig: { parameters?: { name: string; type?: TypeDocType }[]; type?: TypeDocType },
): string {
    const params = (sig.parameters ?? []).map((p) => `${p.name}: ${typeToString(p.type)}`).join(', ');
    const ret = typeToString(sig.type);
    return `function ${name}(${params}): ${ret};`;
}

/**
 * Render a TypeDoc serialised type to its TypeScript source form. Covers the
 * type kinds the docs generator actually encounters: intrinsic, reference
 * (with generic arguments), array, union, intersection, literal, reflection
 * (anonymous object + callable), tuple, typeOperator, indexedAccess, query,
 * predicate, conditional, mapped, and templateLiteral. Unknown discriminator
 * values fall through to `type.name` or the discriminator string itself so
 * the output is never silently `unknown`.
 *
 * @param type - The TypeDoc type node, or `undefined`.
 * @returns A TypeScript source representation of the type.
 */
function typeToString(type: TypeDocType | undefined): string {
    if (!type) return 'unknown';
    switch (type.type) {
        case 'intrinsic':
            return type.name ?? 'unknown';
        case 'literal':
            if (type.value === null) return 'null';
            return typeof type.value === 'string' ? `'${type.value}'` : String(type.value);
        case 'reference': {
            const args = type.typeArguments?.length ? `<${type.typeArguments.map(typeToString).join(', ')}>` : '';
            return `${type.name ?? 'unknown'}${args}`;
        }
        case 'array':
            return `${typeToString(type.elementType)}[]`;
        case 'union':
            return (type.types ?? []).map(typeToString).join(' | ');
        case 'intersection':
            return (type.types ?? []).map(typeToString).join(' & ');
        case 'reflection': {
            const decl = type.declaration;
            const sig = decl?.signatures?.[0];
            if (sig) {
                const params = (sig.parameters ?? []).map((p) => `${p.name}: ${typeToString(p.type)}`).join(', ');
                return `(${params}) => ${typeToString(sig.type)}`;
            }
            if (decl?.children?.length) {
                const props = decl.children.map((c) => `${c.name}: ${typeToString(c.type)}`).join('; ');
                return `{ ${props} }`;
            }
            return '{}';
        }
        case 'tuple':
            return `[${(type.elements ?? []).map(typeToString).join(', ')}]`;
        case 'typeOperator':
            return `${type.operator ?? ''} ${typeToString(type.target as TypeDocType)}`.trim();
        case 'indexedAccess':
            return `${typeToString(type.objectType)}[${typeToString(type.indexType)}]`;
        case 'query':
            return `typeof ${typeToString(type.queryType)}`;
        case 'predicate':
            return `${type.name ?? ''} is ${typeToString(type.targetType)}`;
        case 'conditional':
            return `${typeToString(type.checkType)} extends ${typeToString(type.extendsType)} ? ${typeToString(type.trueType)} : ${typeToString(type.falseType)}`;
        case 'templateLiteral': {
            const head = type.head ?? '';
            const tail = (type.tail ?? []).map((t) => `\${${typeToString(t.type)}}${t.text}`).join('');
            return `\`${head}${tail}\``;
        }
        case 'mapped':
            return '{ [K in …]: … }';
        default:
            return type.name ?? type.type;
    }
}

/**
 * Render a TypeDoc type as inline Markdown. Each reference-type name is
 * wrapped in single backticks so `remarkLinkSymbols` can rewrite it into
 * a link to the type's reference page at MDX-compile time. Intrinsics,
 * literals and operators emit plain text. Markdown table cells use this
 * helper for the Type column so composite types like `Promise<A | B>` get
 * a clickable `A` and `B` without losing the surrounding TypeScript syntax.
 *
 * @param type - TypeDoc type node, or `undefined`.
 * @returns Inline Markdown string safe for table cells (pipes escaped).
 */
function typeToInlineMd(type: TypeDocType | undefined): string {
    return escapeTableCell(typeToInlineMdRaw(type));
}

/**
 * Build the inline-Markdown form of a type without escaping pipes. Used
 * recursively, then `escapeTableCell` wraps the top-level call to make the
 * result safe for a GFM table cell.
 *
 * @param type - TypeDoc type node, or `undefined`.
 * @returns Inline Markdown string, pipes unescaped.
 */
function typeToInlineMdRaw(type: TypeDocType | undefined): string {
    if (!type) return '`unknown`';
    switch (type.type) {
        case 'intrinsic':
            return `\`${type.name ?? 'unknown'}\``;
        case 'literal':
            if (type.value === null) return '`null`';
            return typeof type.value === 'string' ? `\`'${type.value}'\`` : `\`${type.value}\``;
        case 'reference': {
            const args = type.typeArguments?.length ? `<${type.typeArguments.map(typeToInlineMdRaw).join(', ')}>` : '';
            return `\`${type.name ?? 'unknown'}\`${args}`;
        }
        case 'array':
            return `${typeToInlineMdRaw(type.elementType)}[]`;
        case 'union':
            return (type.types ?? []).map(typeToInlineMdRaw).join(' | ');
        case 'intersection':
            return (type.types ?? []).map(typeToInlineMdRaw).join(' & ');
        case 'reflection': {
            const decl = type.declaration;
            const sig = decl?.signatures?.[0];
            if (sig) {
                const params = (sig.parameters ?? []).map((p) => `${p.name}: ${typeToInlineMdRaw(p.type)}`).join(', ');
                return `(${params}) => ${typeToInlineMdRaw(sig.type)}`;
            }
            if (decl?.children?.length) {
                const props = decl.children.map((c) => `${c.name}: ${typeToInlineMdRaw(c.type)}`).join('; ');
                return `{ ${props} }`;
            }
            return '`{}`';
        }
        case 'tuple':
            return `[${(type.elements ?? []).map(typeToInlineMdRaw).join(', ')}]`;
        case 'typeOperator':
            return `${type.operator ?? ''} ${typeToInlineMdRaw(type.target as TypeDocType)}`.trim();
        case 'indexedAccess':
            return `${typeToInlineMdRaw(type.objectType)}[${typeToInlineMdRaw(type.indexType)}]`;
        case 'query':
            return `typeof ${typeToInlineMdRaw(type.queryType)}`;
        case 'predicate':
            return `${type.name ?? ''} is ${typeToInlineMdRaw(type.targetType)}`;
        case 'conditional':
            return `${typeToInlineMdRaw(type.checkType)} extends ${typeToInlineMdRaw(type.extendsType)} ? ${typeToInlineMdRaw(type.trueType)} : ${typeToInlineMdRaw(type.falseType)}`;
        case 'templateLiteral':
            return '`` `…` ``';
        case 'mapped':
            return '`{ [K in …]: … }`';
        default:
            return type.name ? `\`${type.name}\`` : `\`${type.type}\``;
    }
}

/**
 * Escape characters that break a GFM table cell when rendered as MDX.
 * `|` would split the cell; bare `<` followed by a letter starts a JSX tag
 * (MDX swallows `<Article>` thinking it's a component); `{` opens a JS
 * expression (MDX tries to parse `{ slug: string }` as an object literal).
 * Replace with HTML entities / backslash escapes so the cell renders as text.
 *
 * @param s - Raw markdown string.
 * @returns Same string with table-breaking chars escaped.
 */
function escapeTableCell(s: string): string {
    return s
        .replace(/\|/g, '\\|')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');
}

/**
 * Render a Markdown parameters table for the first signature's parameters.
 * Descriptions are sourced from `@param` block tags when present.
 *
 * @param symbol - TypeDoc symbol providing the signatures.
 * @param blockTags - Block tags carrying `@param` descriptions.
 * @returns Markdown table string with trailing newline, or empty string when no parameters.
 */
function renderParams(symbol: TypeDocSymbol, blockTags: { tag: string; content: TypeDocCommentNode[] }[]): string {
    const params = symbol.signatures?.[0]?.parameters ?? [];
    if (params.length === 0) return '';
    const rows = params.map((p) => {
        const desc = blockTags.find((t) => t.tag === '@param' && t.content[0]?.text?.startsWith(p.name))?.content ?? [];
        return `| \`${p.name}\` | ${typeToInlineMd(p.type)} | ${plainText(desc)} |`;
    });
    return ['## Parameters', '', '| Name | Type | Description |', '|---|---|---|', ...rows, ''].join('\n');
}

/**
 * Render a `## Returns` section from a `@returns` block tag when present.
 *
 * @param blockTags - Block tags to scan for `@returns`.
 * @returns Markdown section string, or empty string when no `@returns` tag.
 */
function renderReturns(blockTags: { tag: string; content: TypeDocCommentNode[] }[]): string {
    const ret = blockTags.find((t) => t.tag === '@returns');
    if (!ret) return '';
    return ['## Returns', '', renderCommentInlineMd(ret.content), ''].join('\n');
}

/**
 * Render a `## Throws` section as `<ThrowsBlock>` with one `<ThrowsRow>` per
 * `@throws` tag. The first identifier in the tag body becomes the class name;
 * the rest of the tag body renders as the "when" description.
 *
 * @param blockTags - Block tags to scan for `@throws`.
 * @returns MDX section string, or empty string when no `@throws` tags.
 */
function renderThrows(blockTags: { tag: string; content: TypeDocCommentNode[] }[]): string {
    const throws = blockTags.filter((t) => t.tag === '@throws');
    if (throws.length === 0) return '';
    const rows = throws.map((t) => {
        const md = renderCommentInlineMd(t.content);
        const match = md.match(/^\s*\{?@link\s+(\w+)\}?\s*-?\s*(.*)$/) ?? md.match(/^\s*`?(\w+)`?\s*[-—]?\s*(.*)$/);
        const cls = match?.[1] ?? 'Error';
        const when = (match?.[2] ?? md).trim();
        return `  <ThrowsRow cls="${cls}">${when}</ThrowsRow>`;
    });
    return ['## Throws', '', '<ThrowsBlock>', ...rows, '</ThrowsBlock>', ''].join('\n');
}

/**
 * Render a `## Example` section from all `@example` block tags.
 *
 * @param blockTags - Block tags to scan for `@example`.
 * @returns Markdown section string, or empty string when no `@example` tags.
 */
function renderExample(blockTags: { tag: string; content: TypeDocCommentNode[] }[]): string {
    const examples = blockTags.filter((t) => t.tag === '@example');
    if (examples.length === 0) return '';
    const blocks = examples.map((e) => renderCommentInlineMd(e.content));
    return ['## Example', '', ...blocks, ''].join('\n');
}

/**
 * Render a `## See also` section as an inline chip flow. Each `@see` entry
 * becomes a space-separated inline-code span — `remarkLinkSymbols` then
 * upgrades resolvable identifiers to anchors that the global pill CSS
 * paints in tab colors, matching visuals/02 `.see-also { .pill }` layout.
 * Unresolvable @see content keeps its inline-code styling without an anchor.
 *
 * @param blockTags - Block tags to scan for `@see`.
 * @returns Markdown section string, or empty string when no `@see` tags.
 */
function renderSeeAlso(blockTags: { tag: string; content: TypeDocCommentNode[] }[]): string {
    const sees = blockTags.filter((t) => t.tag === '@see');
    if (sees.length === 0) return '';
    const chips = sees.map((s) => {
        const raw = renderCommentInlineMd(s.content).trim();
        // Strip leading list-marker hyphen left over from JSDoc, and any
        // already-present backticks (we wrap the whole token uniformly).
        const cleaned = raw.replace(/^-?\s*/, '').replace(/^`(.+)`$/, '$1');
        const token = cleaned.match(/^[A-Za-z][A-Za-z0-9_]{1,}$/) ? cleaned : cleaned;
        return `\`${token}\``;
    });
    return ['## See also', '', chips.join(' '), ''].join('\n');
}

/**
 * Render a `<SourceFooter>` component for the symbol's originating file on
 * GitHub. Falls back to `GITHUB_BASE/<fileName>#L<line>` when no `url` is
 * present on the source reflection.
 *
 * @param symbol - TypeDoc symbol whose first source entry is used.
 * @param workspaceSlug - Workspace folder slug under `apps/` or `packages/`.
 * @returns MDX component string, or empty string when no source.
 */
function renderSource(symbol: TypeDocSymbol, workspaceSlug: string): string {
    const src = symbol.sources?.[0];
    if (!src) return '';
    const url = src.url ?? `${GITHUB_BASE}/${src.fileName}#L${src.line}`;
    const pkg = `@nordcom/commerce-${workspaceSlug}`;
    const version = workspaceVersion(workspaceSlug, src.fileName);
    const versionAttr = version ? ` version="${version}"` : '';
    return `\n<SourceFooter file="${src.fileName}" line={${src.line}} href="${url}" pkg="${pkg}"${versionAttr} />`;
}

/**
 * Extract raw text from TypeDoc comment nodes without any MDX or Markdown
 * escaping. Used for YAML frontmatter fields where the output must be a
 * plain string — not MDX body content.
 *
 * @param nodes - Array of comment nodes, or `undefined`.
 * @returns Concatenated raw text.
 */
function rawCommentText(nodes: TypeDocCommentNode[] | undefined): string {
    if (!nodes) return '';
    return nodes.map((n) => (n.kind === 'text' || n.kind === 'code' ? n.text : '')).join('');
}

/**
 * Convert an array of TypeDoc comment nodes to an inline Markdown string
 * safe for use in an MDX document body. `text` nodes have bare curly braces
 * escaped so MDX does not interpret them as JSX expressions. `code` nodes
 * pass through verbatim (wrapped in backticks, already safe). `inlineTag`
 * nodes with `@link` are rendered as inline code to avoid unresolvable link
 * targets.
 *
 * @param nodes - Array of comment nodes, or `undefined`.
 * @returns Rendered inline Markdown string safe for MDX.
 */
function renderCommentInlineMd(nodes: TypeDocCommentNode[] | undefined): string {
    if (!nodes) return '';
    return nodes
        .map((n) => {
            if (n.kind === 'text') return n.text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
            if (n.kind === 'code') return n.text;
            if (n.kind === 'inlineTag' && n.tag === '@link') return `\`${n.target ?? n.text}\``;
            return '';
        })
        .join('');
}

/**
 * Strip Markdown syntax from a comment summary and truncate to 160 characters.
 * Used for the YAML `description` frontmatter field.
 *
 * @param md - Markdown string to simplify.
 * @returns Plain-text string, at most 160 characters.
 */
function plainSummary(md: string): string {
    return md
        .replace(/[`*_>#-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);
}

/**
 * Convert comment nodes to plain text, wrapping `code` nodes in backticks.
 * Used for table cells where inline HTML is undesirable.
 *
 * @param nodes - Array of comment nodes.
 * @returns Plain text string.
 */
function plainText(nodes: TypeDocCommentNode[]): string {
    return nodes.map((n) => (n.kind === 'text' ? n.text : n.kind === 'code' ? `\`${n.text}\`` : '')).join('');
}

/**
 * Escape a string for safe embedding inside a YAML double-quoted scalar.
 * Escapes backslashes first, then double-quotes, then strips newlines so the
 * value stays on one line and never trips the YAML block-scalar parser.
 *
 * @param s - Input string.
 * @returns Escaped string safe for `description: "..."`.
 */
function escapeYaml(s: string): string {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/[\r\n]+/g, ' ');
}

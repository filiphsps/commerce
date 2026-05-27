import type { SymbolKindLabel } from './symbol-classify';
import type { TypeDocCommentNode, TypeDocSymbol } from './typedoc-types';

const GITHUB_BASE = 'https://github.com/filiphsps/commerce/blob/master';

export type SymbolRenderArgs = {
    workspaceSlug: string;
    subpath: string;
    symbol: TypeDocSymbol;
    kind: SymbolKindLabel;
};

/**
 * Emit an MDX page for a single function / class / React component symbol.
 * Sections: deprecated/beta/experimental banner, h1, kind-line, summary,
 * signature codeblock, parameters table, returns, throws, example, see-also,
 * source footer. Matches the layout in visuals/02-page-reference.html.
 *
 * @param args - Workspace, subpath, symbol, and resolved kind label.
 * @returns The full MDX file body (frontmatter included).
 */
export function renderSymbolMdx(args: SymbolRenderArgs): string {
    const { symbol, kind, workspaceSlug, subpath } = args;
    const rawNodes = symbol.comment?.summary ?? symbol.signatures?.[0]?.comment?.summary;
    // Body summary escapes curly braces so MDX does not interpret them as JSX.
    const summary = renderCommentInlineMd(rawNodes);
    // Description uses raw text (no MDX escaping) so YAML stays valid.
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
    const sigBlock = renderSignature(symbol);
    const params = renderParams(symbol, blockTags);
    const returns = renderReturns(blockTags);
    const throws = renderThrows(blockTags);
    const example = renderExample(blockTags);
    const seeAlso = renderSeeAlso(blockTags);
    const source = renderSource(symbol, workspaceSlug);

    return [
        frontmatter,
        banner,
        renderKindLine(kind, workspaceSlug, subpath, blockTags),
        '',
        summary,
        '',
        '## Signature',
        '',
        renderSignatureWithTitle(workspaceSlug, sigBlock),
        params,
        returns,
        throws,
        example,
        seeAlso,
        source,
    ]
        .filter(Boolean)
        .join('\n');
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
 * path, and optional `throws` badge.
 *
 * @param kind - Normalised kind label.
 * @param slug - Workspace slug.
 * @param subpath - Subpath export key.
 * @param blockTags - Block tags used to detect `@throws`.
 * @returns MDX component string.
 */
function renderKindLine(kind: SymbolKindLabel, slug: string, subpath: string, blockTags: { tag: string }[]): string {
    const throwsTag = blockTags.some((t) => t.tag === '@throws') ? ' · throws' : '';
    return `<KindLine kind="${kind}" path="${slug}/${subpath}"${throwsTag ? ' throws' : ''} />`;
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
 * Produce a simplified TypeScript signature text for a single signature reflection.
 * Type shapes are simplified to their `name` field — this is intentional since the
 * full type structure is available via TypeDoc links on the generated page.
 *
 * @param name - Symbol name (function name).
 * @param sig - Single signature reflection.
 * @returns One-line TypeScript function signature string.
 */
function symbolToSignatureText(
    name: string,
    sig: { parameters?: { name: string; type?: { name?: string } }[]; type?: { name?: string } },
): string {
    const params = (sig.parameters ?? []).map((p) => `${p.name}: ${p.type?.name ?? 'unknown'}`).join(', ');
    const ret = sig.type?.name ?? 'unknown';
    return `function ${name}(${params}): ${ret};`;
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
        return `| \`${p.name}\` | \`${p.type?.name ?? '—'}\` | ${plainText(desc)} |`;
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
 * Render a `## See also` section from all `@see` block tags as a bullet list.
 *
 * @param blockTags - Block tags to scan for `@see`.
 * @returns Markdown section string, or empty string when no `@see` tags.
 */
function renderSeeAlso(blockTags: { tag: string; content: TypeDocCommentNode[] }[]): string {
    const sees = blockTags.filter((t) => t.tag === '@see');
    if (sees.length === 0) return '';
    const items = sees.map((s) => `- ${renderCommentInlineMd(s.content)}`);
    return ['## See also', '', ...items, ''].join('\n');
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
    return `\n<SourceFooter file="${src.fileName}" line={${src.line}} href="${url}" pkg="${pkg}" />`;
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

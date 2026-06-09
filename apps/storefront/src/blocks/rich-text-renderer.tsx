import type { ProseMirrorDocument, ProseMirrorMark, ProseMirrorNode } from '@nordcom/commerce-cms/editor/richtext';
import { Fragment, type JSX, type ReactNode } from 'react';
import Link from '@/components/link';
import type { Locale } from '@/utils/locale';
import { resolveLink } from './resolve-link';

/**
 * Minimal renderer for the ProseMirror/Tiptap rich-text JSON the CMSRICH-01
 * editor persists. Mirrors the Prismic `PrismicText` component's role: turn
 * a structured document into React nodes inside the existing `Content`
 * typography wrapper.
 *
 * The renderer is intentionally local to the storefront — we don't pull
 * `@tiptap/*` (or `prosemirror-model`) because (a) they're heavy deps
 * relative to what we actually render here, (b) their HTML serializers
 * don't know about the storefront's `Link` component or the locale-prefixed
 * URL scheme, and (c) they'd couple the storefront to the editor stack's
 * versioning.
 *
 * Supported node types: `doc`, `paragraph`, `heading` (h1–h6),
 * `bulletList`/`orderedList`/`listItem`, `blockquote`, `hardBreak`,
 * `horizontalRule`, and inline `text` with `bold`/`italic`/`underline`/
 * `strike`/`code` marks plus the `link` mark. Anything unrecognized falls
 * back to rendering its children so editors don't lose content when a new
 * node type ships before the renderer is updated.
 */

/** The document shape the rich-text block body carries after the Lexical → ProseMirror migration. */
export type RichTextDocument = ProseMirrorDocument | null | undefined;

/**
 * Inline format marks in the legacy renderer's wrapping order (outermost →
 * innermost: `<strong><em><u><s><code>`). The order is load-bearing: the
 * golden-parity suite pins the migrated corpus to the exact DOM the Lexical
 * renderer produced, and Lexical applied its format bitmask in this order.
 */
const MARK_TAGS = [
    ['bold', 'strong'],
    ['italic', 'em'],
    ['underline', 'u'],
    ['strike', 's'],
    ['code', 'code'],
] as const satisfies readonly (readonly [string, keyof JSX.IntrinsicElements])[];

/** Heading levels → tags; out-of-range levels clamp to `h2`, matching the legacy default. */
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

/**
 * Extracts the `link` mark from an inline node's mark set, if present.
 *
 * @param node - The inline ProseMirror node to inspect.
 * @returns The link mark, or `null` when the node is not part of a link.
 */
const linkMarkOf = (node: ProseMirrorNode): ProseMirrorMark | null =>
    (node.marks ?? []).find((mark) => mark.type === 'link') ?? null;

/**
 * Compares two link marks for grouping purposes. ProseMirror stores links as
 * marks on each inline node, so a single authored link spans several nodes
 * (e.g. plain + bold text); nodes whose link attributes match must collapse
 * into one anchor to reproduce the `<a>wrapping element</a>` DOM the Lexical
 * renderer emitted.
 *
 * @param a - The first link mark (or `null` for "not a link").
 * @param b - The second link mark (or `null` for "not a link").
 * @returns Whether both nodes belong to the same anchor run.
 */
const sameLink = (a: ProseMirrorMark | null, b: ProseMirrorMark | null): boolean => {
    if (a === null || b === null) return a === b;
    return a.attrs?.href === b.attrs?.href && a.attrs?.target === b.attrs?.target && a.attrs?.rel === b.attrs?.rel;
};

/**
 * Renders a single inline node (text or hardBreak) with its format marks
 * applied, excluding the `link` mark — links are handled one level up so
 * consecutive nodes sharing a link render inside a single anchor.
 *
 * Unknown mark types are skipped (the text still renders) and unknown inline
 * node types fall back to their children so content is never silently lost.
 *
 * @param node - The inline ProseMirror node to render.
 * @param idx - The React list key index within the parent's children array.
 * @returns The rendered inline React node.
 */
const renderInline = (node: ProseMirrorNode, idx: number): ReactNode => {
    switch (node.type) {
        case 'text': {
            const marks = node.marks ?? [];
            let element: ReactNode = node.text ?? '';
            // Wrap inside-out so `bold` ends up outermost — see MARK_TAGS.
            for (let i = MARK_TAGS.length - 1; i >= 0; i--) {
                const entry = MARK_TAGS[i];
                if (!entry) continue;
                const [markType, Tag] = entry;
                if (marks.some((mark) => mark.type === markType)) element = <Tag>{element}</Tag>;
            }
            return <Fragment key={idx}>{element}</Fragment>;
        }
        case 'hardBreak':
            return <br key={idx} />;
        default:
            return <Fragment key={idx}>{(node.content ?? []).map((child, i) => renderInline(child, i))}</Fragment>;
    }
};

/**
 * Renders an inline run (the children of a paragraph or heading), grouping
 * consecutive nodes that share a `link` mark into a single storefront `Link`.
 * Link hrefs pass through `resolveLink`'s scheme gate — `javascript:`/`data:`
 * URLs drop the anchor but keep the inner content. Locale-prefixed internal
 * URLs (`/en-US/…/`) pass through verbatim, trailing slash intact.
 *
 * @param children - The inline ProseMirror nodes to render, or `undefined`.
 * @param locale - The active locale forwarded to link resolution.
 * @returns The rendered inline React nodes.
 */
const renderInlineRun = (children: ProseMirrorNode[] | undefined, locale: Locale): ReactNode => {
    const nodes = children ?? [];
    const out: ReactNode[] = [];

    let group: ProseMirrorNode[] = [];
    let groupLink: ProseMirrorMark | null = null;

    const flush = (): void => {
        if (group.length === 0) return;
        const key = out.length;
        const inner = group.map((node, i) => renderInline(node, i));
        if (groupLink === null) {
            out.push(<Fragment key={key}>{inner}</Fragment>);
        } else {
            const href = typeof groupLink.attrs?.href === 'string' ? groupLink.attrs.href : undefined;
            const openInNewTab = groupLink.attrs?.target === '_blank';
            const resolved = resolveLink(href ? { kind: 'external', url: href, openInNewTab } : null, { locale });
            if (!resolved) {
                out.push(<Fragment key={key}>{inner}</Fragment>);
            } else {
                const target = typeof groupLink.attrs?.target === 'string' ? groupLink.attrs.target : undefined;
                const rel = typeof groupLink.attrs?.rel === 'string' ? groupLink.attrs.rel : undefined;
                out.push(
                    <Link key={key} href={resolved.href} target={target} rel={rel}>
                        {inner}
                    </Link>,
                );
            }
        }
        group = [];
        groupLink = null;
    };

    for (const node of nodes) {
        const link = linkMarkOf(node);
        if (group.length > 0 && !sameLink(groupLink, link)) flush();
        groupLink = link;
        group.push(node);
    }
    flush();

    return out;
};

/**
 * Renders a list item. The Lexical → ProseMirror codec wraps every item's
 * inline run in a paragraph (Tiptap's canonical `listItem` content), but the
 * legacy DOM — and the typography styles tuned to it — render `<li>` content
 * bare. A leading paragraph followed only by nested lists therefore unwraps
 * to its inline run; any other shape renders its blocks as-is.
 *
 * @param node - The `listItem` node to render.
 * @param idx - The React list key index within the parent list.
 * @param locale - The active locale forwarded to nested rendering.
 * @returns The rendered `<li>` element.
 */
const renderListItem = (node: ProseMirrorNode, idx: number, locale: Locale): ReactNode => {
    const content = node.content ?? [];
    const head = content[0];
    const rest = content.slice(1);
    if (head?.type === 'paragraph' && rest.every((c) => c.type === 'bulletList' || c.type === 'orderedList')) {
        return (
            <li key={idx}>
                {renderInlineRun(head.content, locale)}
                {rest.map((child, i) => renderBlock(child, i, locale))}
            </li>
        );
    }
    return <li key={idx}>{content.map((child, i) => renderBlock(child, i, locale))}</li>;
};

/**
 * Dispatches a single block-level ProseMirror node to its React element.
 * Unknown node types fall back to rendering their children so content is
 * never silently dropped when new node types ship ahead of this renderer.
 *
 * @param node - The ProseMirror node to render.
 * @param idx - The React list key index within the parent's children array.
 * @param locale - The active locale used for link href resolution.
 * @returns The React node for the given ProseMirror node.
 */
const renderBlock = (node: ProseMirrorNode, idx: number, locale: Locale): ReactNode => {
    switch (node.type) {
        case 'paragraph':
            return <p key={idx}>{renderInlineRun(node.content, locale)}</p>;

        case 'heading': {
            const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 2;
            const Tag = HEADING_TAGS[level - 1] ?? 'h2';
            return <Tag key={idx}>{renderInlineRun(node.content, locale)}</Tag>;
        }

        case 'bulletList':
            return <ul key={idx}>{(node.content ?? []).map((item, i) => renderListItem(item, i, locale))}</ul>;

        case 'orderedList': {
            // HTML defaults `start` to 1, so only a non-default start is
            // emitted — the legacy DOM never carried the attribute.
            const start =
                typeof node.attrs?.start === 'number' && node.attrs.start !== 1 ? node.attrs.start : undefined;
            return (
                <ol key={idx} start={start}>
                    {(node.content ?? []).map((item, i) => renderListItem(item, i, locale))}
                </ol>
            );
        }

        case 'listItem':
            return renderListItem(node, idx, locale);

        case 'blockquote': {
            // The codec wraps a Lexical quote's inline run in exactly one
            // paragraph; the legacy DOM rendered the run bare inside the
            // blockquote. Unwrap the single-paragraph case to keep that DOM;
            // genuinely multi-block quotes render their blocks.
            const content = node.content ?? [];
            const only = content[0];
            if (content.length === 1 && only?.type === 'paragraph') {
                return <blockquote key={idx}>{renderInlineRun(only.content, locale)}</blockquote>;
            }
            return <blockquote key={idx}>{content.map((child, i) => renderBlock(child, i, locale))}</blockquote>;
        }

        case 'horizontalRule':
            return <hr key={idx} />;

        case 'text':
        case 'hardBreak':
            // Inline nodes don't belong at block level in a valid document,
            // but render them anyway rather than dropping authored content.
            return <Fragment key={idx}>{renderInlineRun([node], locale)}</Fragment>;

        default:
            // Unknown node type — render its children so editors don't
            // silently lose content when a new node ships ahead of the
            // renderer.
            return (
                <Fragment key={idx}>{(node.content ?? []).map((child, i) => renderBlock(child, i, locale))}</Fragment>
            );
    }
};

export type RichTextProps = {
    data: RichTextDocument;
    locale: Locale;
};

/**
 * Render a ProseMirror rich-text document. Returns `null` when the document
 * is empty so callers can avoid emitting an empty wrapper.
 *
 * `data` is expected to be a resolved `{ type: 'doc', content: [...] }`
 * document. Locale-map unwrapping happens upstream in
 * `apps/storefront/src/api/_normalize-payload.ts` — the renderer trusts its
 * input.
 *
 * @param data - The ProseMirror document to render.
 * @param locale - The active locale forwarded to link resolution within the document.
 * @returns The rendered React node tree, or `null` for an empty document.
 */
export const RichText = ({ data, locale }: RichTextProps): ReactNode => {
    const content = data?.content;
    if (!content || content.length === 0) return null;
    return <>{content.map((node, idx) => renderBlock(node, idx, locale))}</>;
};

/**
 * Quick predicate so block components can skip wrapping empty rich-text
 * regions in containers (e.g. the Banner subheading area).
 *
 * @param data - The ProseMirror document to check.
 * @returns `true` when the document has no content or only an empty initial paragraph.
 */
export const isRichTextEmpty = (data: RichTextDocument): boolean => {
    const content = data?.content;
    if (!content || content.length === 0) return true;
    // A single empty paragraph (the editor's canonical empty state — and
    // what the codec emits for an empty Lexical document) should also count
    // as empty, otherwise editors leave an invisible <p/> block in every
    // rendered page.
    if (content.length === 1) {
        const only = content[0];
        if (only && only.type === 'paragraph') {
            const text = (only.content ?? []).flatMap((c) => (c.type === 'text' ? [c.text ?? ''] : []));
            if (text.join('').trim().length === 0) return true;
        }
    }
    return false;
};

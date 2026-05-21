import { Fragment, type JSX, type ReactNode } from 'react';
import Link from '@/components/link';
import type { Locale } from '@/utils/locale';
import { resolveLink } from './resolve-link';

/**
 * Minimal renderer for Payload's Lexical rich-text JSON. Mirrors the
 * Prismic `PrismicText` component's role: turn a structured document
 * into React nodes inside the existing `Content` typography wrapper.
 *
 * The renderer is intentionally local to the storefront — we don't pull
 * `@payloadcms/richtext-lexical/react` because (a) it's a heavy dep
 * relative to what we actually render here, (b) it ships its own
 * link/serializer model that doesn't know about the storefront's
 * `Link` component or the locale-prefixed URL scheme, and (c) it'd
 * couple the storefront to Payload's React renderer versioning.
 *
 * Supported node types: `root`, `paragraph`, `heading` (h1–h6), `list`
 * (ordered/unordered) and `listitem`, `quote`, `link`, `linebreak`,
 * inline `text` with format bitmask marks (bold/italic/underline/
 * strikethrough/code). Anything unrecognised falls back to a `<span>`
 * with its children so editors don't lose content when a new node
 * type ships before the renderer is updated.
 */

// Lexical's text node serialises formatting marks into a bitmask. The bit
// indices below match the upstream `IS_*` constants and Payload's editor
// output — see @lexical/text constants.
const FORMAT = {
    BOLD: 1,
    ITALIC: 1 << 1,
    STRIKETHROUGH: 1 << 2,
    UNDERLINE: 1 << 3,
    CODE: 1 << 4,
    SUBSCRIPT: 1 << 5,
    SUPERSCRIPT: 1 << 6,
} as const;

type LexicalTextNode = {
    type: 'text';
    text: string;
    format?: number;
};

type LexicalLinebreakNode = { type: 'linebreak' };

type LexicalParagraphNode = {
    type: 'paragraph';
    children?: LexicalNode[];
};

type LexicalHeadingNode = {
    type: 'heading';
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    children?: LexicalNode[];
};

type LexicalListNode = {
    type: 'list';
    listType?: 'bullet' | 'number';
    tag?: 'ul' | 'ol';
    children?: LexicalNode[];
};

type LexicalListItemNode = {
    type: 'listitem';
    children?: LexicalNode[];
};

type LexicalQuoteNode = {
    type: 'quote';
    children?: LexicalNode[];
};

type LexicalLinkNode = {
    type: 'link';
    fields?: { url?: string; newTab?: boolean; linkType?: 'custom' | 'internal' };
    url?: string;
    newTab?: boolean;
    children?: LexicalNode[];
};

type LexicalUnknownNode = {
    type?: string;
    children?: LexicalNode[];
    text?: string;
};

type LexicalNode =
    | LexicalTextNode
    | LexicalLinebreakNode
    | LexicalParagraphNode
    | LexicalHeadingNode
    | LexicalListNode
    | LexicalListItemNode
    | LexicalQuoteNode
    | LexicalLinkNode
    | LexicalUnknownNode;

export type LexicalRoot = { root?: { children?: LexicalNode[] } } | null | undefined;

const renderText = (node: LexicalTextNode, idx: number): ReactNode => {
    const format = node.format ?? 0;
    let element: ReactNode = node.text;

    // Wrap inside-out so the visual order matches Lexical's apply order.
    if (format & FORMAT.CODE) element = <code>{element}</code>;
    if (format & FORMAT.STRIKETHROUGH) element = <s>{element}</s>;
    if (format & FORMAT.UNDERLINE) element = <u>{element}</u>;
    if (format & FORMAT.ITALIC) element = <em>{element}</em>;
    if (format & FORMAT.BOLD) element = <strong>{element}</strong>;
    if (format & FORMAT.SUBSCRIPT) element = <sub>{element}</sub>;
    if (format & FORMAT.SUPERSCRIPT) element = <sup>{element}</sup>;

    return <Fragment key={idx}>{element}</Fragment>;
};

const renderChildren = (children: LexicalNode[] | undefined, locale: Locale): ReactNode =>
    (children ?? []).map((child, idx) => renderNode(child, idx, locale));

const renderNode = (node: LexicalNode, idx: number, locale: Locale): ReactNode => {
    const type = (node as { type?: string }).type;

    switch (type) {
        case 'text':
            return renderText(node as LexicalTextNode, idx);

        case 'linebreak':
            return <br key={idx} />;

        case 'paragraph':
            return <p key={idx}>{renderChildren((node as LexicalParagraphNode).children, locale)}</p>;

        case 'heading': {
            const heading = node as LexicalHeadingNode;
            const Tag = (heading.tag || 'h2') as JSX.IntrinsicElements extends infer J
                ? keyof J extends infer K
                    ? K extends 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
                        ? K
                        : never
                    : never
                : never;
            return <Tag key={idx}>{renderChildren(heading.children, locale)}</Tag>;
        }

        case 'list': {
            const list = node as LexicalListNode;
            // Lexical exports either `listType: 'number'|'bullet'` (current)
            // or `tag: 'ol'|'ul'` (legacy) — accept both so older documents
            // don't render as the wrong list style after the schema change.
            const ordered = list.listType === 'number' || list.tag === 'ol';
            const ListTag = ordered ? 'ol' : 'ul';
            return <ListTag key={idx}>{renderChildren(list.children, locale)}</ListTag>;
        }

        case 'listitem':
            return <li key={idx}>{renderChildren((node as LexicalListItemNode).children, locale)}</li>;

        case 'quote':
            return <blockquote key={idx}>{renderChildren((node as LexicalQuoteNode).children, locale)}</blockquote>;

        case 'link': {
            // Lexical's link plugin nests the destination under `fields` for
            // Payload's custom link, while a plain `link` node uses the top-
            // level `url`. Read both so either editor configuration renders.
            const link = node as LexicalLinkNode;
            const url = link.fields?.url ?? link.url;
            const newTab = link.fields?.newTab ?? link.newTab;
            const resolved = resolveLink(url ? { kind: 'external', url, openInNewTab: newTab } : null, { locale });
            const children = renderChildren(link.children, locale);
            if (!resolved) return <Fragment key={idx}>{children}</Fragment>;
            return (
                <Link
                    key={idx}
                    href={resolved.href}
                    target={resolved.openInNewTab ? '_blank' : undefined}
                    rel={resolved.openInNewTab ? 'noopener noreferrer' : undefined}
                >
                    {children}
                </Link>
            );
        }

        default:
            // Unknown node type — render its children inline so editors
            // don't silently lose content when a new node ships ahead of
            // the renderer.
            return <Fragment key={idx}>{renderChildren((node as LexicalUnknownNode).children, locale)}</Fragment>;
    }
};

export type RichTextProps = {
    data: LexicalRoot;
    locale: Locale;
};

/**
 * Payload returns a localized richText field as `{ <locale>: { root: ... } }`
 * when the request locale doesn't resolve. Unwrap the first lexical document
 * we find so the renderer is resilient to upstream locale misconfig — same
 * defense as `payload-value.ts` does for simple text fields.
 */
const unwrapLexicalDocument = (data: LexicalRoot): LexicalRoot => {
    if (!data) return null;
    if ((data as { root?: unknown }).root) return data;
    // Locale-map shape: pick the first value whose `.root.children` looks valid.
    if (typeof data === 'object' && data !== null) {
        for (const value of Object.values(data as Record<string, unknown>)) {
            if (value && typeof value === 'object' && (value as { root?: unknown }).root) {
                return value as LexicalRoot;
            }
        }
    }
    return null;
};

/**
 * Render a Lexical rich-text document. Returns `null` when the document is
 * empty so callers can avoid emitting an empty wrapper.
 */
export const RichText = ({ data, locale }: RichTextProps): ReactNode => {
    const doc = unwrapLexicalDocument(data);
    const children = doc?.root?.children;
    if (!children || children.length === 0) return null;
    return <>{renderChildren(children, locale)}</>;
};

/**
 * Quick predicate so block components can skip wrapping empty rich-text
 * regions in containers (e.g. the Banner subheading area).
 */
export const isRichTextEmpty = (data: LexicalRoot): boolean => {
    const doc = unwrapLexicalDocument(data);
    const children = doc?.root?.children;
    if (!children || children.length === 0) return true;
    // A single empty paragraph (the editor's initial state) should also
    // count as empty, otherwise editors leave an invisible <p/> block in
    // every rendered page.
    if (children.length === 1) {
        const only = children[0] as LexicalNode | undefined;
        if (only && (only as { type?: string }).type === 'paragraph') {
            const text = (only as LexicalParagraphNode).children?.flatMap((c) =>
                (c as { type?: string }).type === 'text' ? [(c as LexicalTextNode).text] : [],
            );
            if (!text || text.join('').trim().length === 0) return true;
        }
    }
    return false;
};

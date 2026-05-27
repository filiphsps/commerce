import type { ReactNode } from 'react';
import type { RichTextBlockNode } from './types';

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] };
type LexicalRoot = { root?: LexicalNode };

/**
 * Recursively convert a Lexical AST node to a React element. Text leaf nodes
 * are returned as plain strings; container nodes are mapped to semantic HTML
 * (h2, p, ul, li) with an index-based key.
 *
 * @param node - A Lexical AST node from the Payload rich-text storage format.
 * @param idx - Array index used as the React list key.
 * @returns A React node (string or element) representing this AST node.
 */
const renderNode = (node: LexicalNode, idx: number): ReactNode => {
    if (typeof node.text === 'string') return node.text;
    const children = (node.children ?? []).map(renderNode);
    switch (node.type) {
        case 'heading':
            return <h2 key={idx}>{children}</h2>;
        case 'paragraph':
            return <p key={idx}>{children}</p>;
        case 'list':
            return <ul key={idx}>{children}</ul>;
        case 'listitem':
            return <li key={idx}>{children}</li>;
        default:
            return <span key={idx}>{children}</span>;
    }
};

/**
 * Renders a {@link RichTextBlockNode} by walking the Lexical AST stored in
 * `block.body`. Wraps the result in a `<details>` element when the block is
 * collapsible; otherwise wraps it in a plain `<div>`.
 *
 * @param block - The rich-text block node with body and collapsible settings.
 * @returns A React element containing the rendered rich text.
 */
export function RichTextBlock({ block }: { block: RichTextBlockNode }) {
    const root = (block.body as LexicalRoot | undefined)?.root;
    const children = (root?.children ?? []).map(renderNode);

    if (block.collapsible) {
        return (
            <details open={block.collapsedByDefault !== true}>
                <summary>{block.collapseLabel ?? 'Read more'}</summary>
                {children}
            </details>
        );
    }
    return <div className="cms-rich-text">{children}</div>;
}

import type { ReactNode } from 'react';
import type { RichTextBlockNode } from './types';

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] };
type LexicalRoot = { root?: LexicalNode };

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

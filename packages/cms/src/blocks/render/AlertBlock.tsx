import type { AlertBlockNode } from './types';

export function AlertBlock({ block }: { block: AlertBlockNode }) {
    return (
        <aside role="alert" data-severity={block.severity} className={`cms-alert cms-alert--${block.severity}`}>
            <strong>{block.title}</strong>
            {block.body ? <p>{block.body}</p> : null}
        </aside>
    );
}

import type { AlertBlockNode } from './types';

/**
 * Renders an {@link AlertBlockNode} as a semantic `<aside role="alert">` with
 * a data-severity attribute for CSS targeting.
 *
 * @param block - The alert block node from the CMS.
 * @returns A React aside element styled by severity.
 */
export function AlertBlock({ block }: { block: AlertBlockNode }) {
    return (
        <aside role="alert" data-severity={block.severity} className={`cms-alert cms-alert--${block.severity}`}>
            <strong>{block.title}</strong>
            {block.body ? <p>{block.body}</p> : null}
        </aside>
    );
}

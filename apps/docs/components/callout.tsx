import type { ReactNode } from 'react';

export type CalloutType = 'info' | 'tip' | 'warn' | 'danger' | 'example' | 'note';

const LABELS: Record<CalloutType, string> = {
    info: 'Concept',
    tip: 'Tip',
    warn: 'Watch out',
    danger: 'Danger',
    example: 'Example',
    note: 'Note',
};

/**
 * Prose-level callout. Six flavors map to one semantic palette color each.
 * The left rail is thick for emphasis; the outer border is thin to lighten
 * overall weight. Visual reference: visuals/08-banners.html.
 *
 * @param props - Callout type, optional label override, and children.
 * @returns A grid-layout callout block with a label and body column.
 */
export function Callout({
    type = 'info',
    label,
    children,
}: {
    type?: CalloutType;
    label?: string;
    children: ReactNode;
}) {
    return (
        <div className={`callout ${type}`}>
            <span className="label">{label ?? LABELS[type]}</span>
            <div>{children}</div>
        </div>
    );
}

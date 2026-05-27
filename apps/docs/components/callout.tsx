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

const VARIANT_CLASSES: Record<CalloutType, { box: string; label: string }> = {
    info: {
        box: 'border-info border-l-[0.29rem] bg-info/5',
        label: 'text-info',
    },
    tip: {
        box: 'border-pkg border-l-[0.29rem] bg-pkg/5',
        label: 'text-pkg',
    },
    warn: {
        box: 'border-err border-l-[0.29rem] bg-err/5',
        label: 'text-err',
    },
    danger: {
        box: 'border-[hsl(0_80%_60%)] border-l-[0.29rem] bg-[hsl(0_80%_60%_/_0.05)] shadow-[0_0_24px_hsl(0_80%_60%_/_0.10)]',
        label: 'text-[hsl(0_80%_65%)]',
    },
    example: {
        box: 'border-ref border-l-[0.29rem] bg-ref/5',
        label: 'text-ref',
    },
    note: {
        box: 'border-border-strong border-l-[0.29rem] bg-bg-1',
        label: 'text-fg-mute',
    },
};

/**
 * Prose-level callout. Six flavors map to one semantic palette color each.
 * The left rail is thick (4.6px) for emphasis; the outer border is thin
 * (2.2px) to lighten overall weight. Reference: visuals/08-banners.html.
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
    const variant = VARIANT_CLASSES[type];
    return (
        <div
            className={`my-5 grid max-w-[60rem] grid-cols-[auto_1fr] gap-3.5 rounded-[0.45rem] border-[0.138rem] px-4 py-3.5 text-[0.92rem] text-fg leading-relaxed [&_code]:rounded-[3px] [&_code]:bg-bg-2 [&_code]:px-1.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-fg ${variant.box}`}
        >
            <span
                className={`self-start whitespace-nowrap pt-0.5 font-extrabold text-[0.6rem] uppercase tracking-[0.18em] ${variant.label}`}
            >
                {label ?? LABELS[type]}
            </span>
            <div>{children}</div>
        </div>
    );
}

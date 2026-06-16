'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PropRow, TypeToken } from '../../lib/props-table-types';

const THRESHOLD = 5;

/**
 * Collapsible props table for interface and type alias reference pages.
 * Renders pre-tokenized type expressions with links, sorts required props
 * before optional, and collapses rows past {@link THRESHOLD} behind a
 * full-width expand strip.
 *
 * @param props - Component props.
 * @param props.rows - Serialized property rows from gen time.
 */
export function PropsTable({ rows }: { rows: PropRow[] }) {
    const [expanded, setExpanded] = useState(false);

    if (rows.length === 0) return null;

    const sorted = [...rows].sort((a, b) => (a.opt === b.opt ? 0 : a.opt ? 1 : -1));
    const visible = expanded ? sorted : sorted.slice(0, THRESHOLD);
    const hasMore = sorted.length > THRESHOLD;
    const hiddenCount = sorted.length - THRESHOLD;

    return (
        <div className="not-prose mb-4">
            <div className="hidden gap-x-4 border-border-strong border-b pb-2 sm:grid sm:grid-cols-[minmax(8rem,max-content)_minmax(0,1fr)_minmax(0,2fr)]">
                {(['PROP', 'TYPE', 'DESCRIPTION'] as const).map((label) => (
                    <span key={label} className="font-mono text-[0.6rem] text-fg-dim uppercase tracking-[0.16em]">
                        {label}
                    </span>
                ))}
            </div>
            <div className="relative">
                {visible.map((row, i) => (
                    <PropRowItem key={row.name} row={row} isLast={i === visible.length - 1} />
                ))}
                {hasMore && !expanded && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute right-0 bottom-0 left-0 h-10 bg-linear-to-b from-transparent to-bg"
                    />
                )}
            </div>
            {hasMore && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="w-full cursor-pointer select-none border-border border-t bg-bg-1 py-2 text-center font-mono text-[0.7rem] text-fg-mute transition-colors duration-100 hover:bg-bg-2 hover:text-fg"
                >
                    {expanded ? 'Collapse ↑' : `Show ${hiddenCount} more ↓`}
                </button>
            )}
        </div>
    );
}

/**
 * Single row in the props table. Stacks name+type on mobile, three columns on sm+.
 *
 * @param props - Component props.
 * @param props.row - The property row data.
 * @param props.isLast - Whether this is the last visible row (suppresses bottom border).
 */
function PropRowItem({ row, isLast }: { row: PropRow; isLast: boolean }) {
    return (
        <div
            className={`group grid grid-cols-[max-content_1fr] gap-x-4 py-2.5 transition-colors duration-100 sm:grid-cols-[minmax(8rem,max-content)_minmax(0,1fr)_minmax(0,2fr)] hover:bg-bg-1${isLast ? '' : 'border-border border-b'}`}
        >
            <div className="min-w-0 self-start overflow-hidden py-0.5">
                <span className="font-mono font-semibold text-[0.84rem] text-fg">{row.name}</span>
                {row.opt && <span className="font-mono text-[0.84rem] text-fg-dim">?</span>}
            </div>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-0.5 self-start py-0.5">
                {row.tokens.map((token, i) => (
                    <TokenSpan key={i} token={token} />
                ))}
            </div>
            <div className="col-span-2 min-w-0 py-0.5 text-[0.85rem] text-fg-mute leading-snug sm:col-span-1">
                {row.desc || null}
            </div>
        </div>
    );
}

/**
 * Render a single type token inline. References become links; keywords, literals,
 * and operators each get their own typographic treatment.
 *
 * @param props - Component props.
 * @param props.token - The token to render.
 */
function TokenSpan({ token }: { token: TypeToken }) {
    switch (token.t) {
        case 'ref':
            return (
                <Link href={token.href} className="font-mono text-[0.84rem] text-brand hover:underline">
                    {token.text}
                </Link>
            );
        case 'kw':
            return <span className="font-mono text-[0.84rem] text-fg">{token.text}</span>;
        case 'lit':
            return (
                <code className="rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[0.8rem] text-fg">{token.text}</code>
            );
        case 'op':
            return <span className="font-mono text-[0.84rem] text-fg-mute">{token.text}</span>;
    }
}

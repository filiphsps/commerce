'use client';

import { useEffect, useRef } from 'react';
import { useProductOptions } from '../context';
import Value from './value';

export type GroupProps = {
    name: string;
    density?: 'compact' | 'spacious';
};

const Group = ({ name, density = 'compact' }: GroupProps) => {
    const { resolved } = useProductOptions();
    const group = resolved.find((g) => g.name === name);
    const rowRef = useRef<HTMLDivElement>(null);
    const total = group?.values.length ?? 0;

    useEffect(() => {
        const rowEl = rowRef.current;
        if (!rowEl) return;
        const update = () => {
            const limit = parseInt(getComputedStyle(rowEl).getPropertyValue('--inline-limit'), 10) || 4;
            const overflow = Math.max(0, total - limit);
            rowEl.dataset.overflow = String(overflow);
            const moreEl = rowEl.parentElement?.querySelector<HTMLButtonElement>('[data-option-more]');
            if (moreEl) moreEl.textContent = `+${overflow}`;
        };
        update();
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(update);
            ro.observe(rowEl);
            return () => ro.disconnect();
        }
    }, [total]);

    if (!group) return null;

    return (
        <div
            ref={rowRef}
            className="product-card-swatch-row flex flex-wrap items-center gap-(--product-card-swatch-gap)"
            data-overflow={String(Math.max(0, total - 4))}
            data-group={name}
        >
            {group.values.map((v) => (
                <span key={v.name} data-option-value>
                    <Value group={group} value={v} density={density} />
                </span>
            ))}
        </div>
    );
};

Group.displayName = 'Nordcom.ProductOptions.Group';
export default Group;

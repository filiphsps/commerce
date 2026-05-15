'use client';

import type { MouseEvent } from 'react';
import styles from '@/components/product-options-selector/renderers/chip.module.scss';
import type { ProductOptionValueRendererProps } from '@/components/product-options-selector/renderers/types';
import { cn } from '@/utils/tailwind';

export const TextChipRenderer = ({
    name,
    value,
    selected,
    available,
    onSelect,
    href,
    density,
}: ProductOptionValueRendererProps) => {
    const ariaLabel = `${name}: ${value}`;
    const className = cn(
        styles.chip,
        density === 'compact' ? styles.compact : styles.spacious,
        selected && styles.selected,
        !available && styles.disabled,
    );

    const handleClick = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
        if (!available) {
            event.preventDefault();
            return;
        }
        onSelect();
    };

    if (href) {
        return (
            <a
                href={href}
                aria-label={ariaLabel}
                aria-disabled={!available || undefined}
                aria-current={selected ? 'true' : undefined}
                className={className}
                onClick={handleClick}
            >
                {value}
            </a>
        );
    }

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            aria-disabled={!available || undefined}
            aria-pressed={selected}
            className={className}
            onClick={handleClick}
        >
            {value}
        </button>
    );
};

TextChipRenderer.displayName = 'Nordcom.ProductOptionsSelector.TextChipRenderer';

'use client';

import type { MouseEvent } from 'react';
import styles from '@/components/product-options-selector/renderers/chip.module.css';
import type { ProductOptionValueRendererProps } from '@/components/product-options-selector/renderers/types';
import { cn } from '@/utils/tailwind';

export const TextChipRenderer = ({
    name,
    value,
    selected,
    available,
    onSelect,
    swatch,
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

    const swatchPreview = swatch?.image?.previewImage?.url;
    const swatchColor = swatch?.color;
    const swatchEl =
        swatchPreview || swatchColor ? (
            <span
                aria-hidden={true}
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200 border-solid bg-center bg-cover"
                style={{
                    backgroundColor: swatchColor ?? undefined,
                    backgroundImage: swatchPreview ? `url(${swatchPreview})` : undefined,
                }}
            />
        ) : null;

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
                {swatchEl}
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
            {swatchEl}
            {value}
        </button>
    );
};

TextChipRenderer.displayName = 'Nordcom.ProductOptionsSelector.TextChipRenderer';

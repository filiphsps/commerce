'use client';

import type { MouseEvent } from 'react';
import type { ProductOptionValueRendererProps } from '@/components/product-options-selector/renderers/types';
import { chipClassName } from './chip-class';

/**
 * Default chip renderer for text-type options, with optional swatch color or image preview.
 *
 * @param props.name - Option group name used for accessible aria labels.
 * @param props.value - Option value label displayed in the chip.
 * @param props.selected - Whether this chip is the currently selected value.
 * @param props.available - When `false`, the chip is disabled and click navigation is suppressed.
 * @param props.onSelect - Callback invoked when the chip is selected.
 * @param props.swatch - Optional color or image swatch shown as a leading circle.
 * @param props.href - Optional deep-link href; renders an anchor instead of a button when provided.
 * @param props.density - Visual density forwarded to `chipClassName`.
 * @returns An anchor or button chip element.
 */
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
    const className = chipClassName({ selected, available, density });

    const handleClick = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
        // Always prevent default: for unavailable chips suppress the click; for available
        // chips prevent the hard browser navigation so useVariantUrlSync handles the URL
        // update via router.replace (no full page reload).
        event.preventDefault();
        if (!available) return;
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
                data-density={density}
                data-selected={selected || undefined}
                data-disabled={!available || undefined}
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
            disabled={!available}
            aria-disabled={!available || undefined}
            aria-pressed={selected}
            data-density={density}
            data-selected={selected || undefined}
            data-disabled={!available || undefined}
            className={className}
            onClick={handleClick}
        >
            {swatchEl}
            {value}
        </button>
    );
};

TextChipRenderer.displayName = 'Nordcom.ProductOptionsSelector.TextChipRenderer';

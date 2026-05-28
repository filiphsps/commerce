'use client';

import type { MouseEvent } from 'react';
import type { ProductOptionValueRendererProps } from '@/components/product-options-selector/renderers/types';
import { useShop } from '@/components/shop/provider';
import { formatWeight, localizeWeight } from '@/utils/locale';
import { chipClassName } from './chip-class';

/**
 * Chip renderer for size-type options, optionally showing a weight sub-label in spacious density.
 *
 * @param props.name - Option group name used for accessible aria labels.
 * @param props.value - Option value label displayed in the chip.
 * @param props.selected - Whether this chip is the currently selected value.
 * @param props.available - When `false`, the chip is visually disabled and clicks are suppressed.
 * @param props.onSelect - Callback invoked when the chip is selected.
 * @param props.href - Optional deep-link href; renders an anchor instead of a button when provided.
 * @param props.density - Visual density; `'spacious'` shows the weight sub-label.
 * @param props.variant - Variant providing weight metadata for the sub-label.
 * @returns An anchor or button chip element.
 */
export const SizeChipRenderer = ({
    name,
    value,
    selected,
    available,
    onSelect,
    href,
    density,
    variant,
}: ProductOptionValueRendererProps) => {
    const { locale } = useShop();

    const ariaLabel = `${name}: ${value}`;
    const showWeightLine =
        density === 'spacious' && typeof variant?.weight === 'number' && Boolean(variant?.weightUnit);
    const weightLabel = showWeightLine
        ? formatWeight(localizeWeight(locale, { weight: variant.weight!, unit: variant.weightUnit! }))
        : null;

    const className = chipClassName({ selected, available, density });

    const handleClick = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
        event.preventDefault();
        if (!available) return;
        onSelect();
    };

    const body = (
        <>
            <span>{value}</span>
            {weightLabel ? <span className="mt-0.5 font-medium text-[0.7em] opacity-75">{weightLabel}</span> : null}
        </>
    );

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
                {body}
            </a>
        );
    }

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            aria-disabled={!available || undefined}
            aria-pressed={selected}
            data-density={density}
            data-selected={selected || undefined}
            data-disabled={!available || undefined}
            className={className}
            onClick={handleClick}
        >
            {body}
        </button>
    );
};

SizeChipRenderer.displayName = 'Nordcom.ProductOptionsSelector.SizeChipRenderer';

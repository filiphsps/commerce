'use client';

import type { MouseEvent } from 'react';
import type { ProductOptionValueRendererProps } from '@/components/product-options-selector/renderers/types';
import { useShop } from '@/components/shop/provider';
import { formatWeight, localizeWeight } from '@/utils/locale';
import { chipClassName } from './chip-class';

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
        if (!available) {
            event.preventDefault();
            return;
        }
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

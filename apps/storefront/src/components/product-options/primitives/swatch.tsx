'use client';

import type { OptionValueRendererProps } from '../types';

/**
 * Color or image swatch button for a single option value, with a struck-through diagonal line when unavailable.
 *
 * @param props.value - Option value data including swatch, selected, and available fields.
 * @param props.onSelect - Callback invoked when the swatch is clicked.
 * @returns The swatch button element.
 */
const Swatch = ({ value, onSelect }: OptionValueRendererProps) => {
    const hasImage = !!value.swatch?.image?.url && !value.swatch?.color;
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-label={value.name}
            aria-pressed={value.selected}
            data-available={value.available ? 'true' : 'false'}
            data-active={value.selected ? 'true' : 'false'}
            disabled={false}
            className="product-options-swatch group/swatch relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center p-(--product-card-swatch-hit-padding) transition-transform focus-visible:outline-none focus-visible:outline-offset-2 data-[available=false]:cursor-not-allowed motion-safe:active:scale-95 motion-safe:hover:scale-110 focus-visible:[outline:2px_solid_var(--focus-ring)]"
            style={{ touchAction: 'manipulation', userSelect: 'none' }}
        >
            <span
                data-swatch-visual
                style={{ '--swatch-color': value.swatch?.color } as React.CSSProperties}
                className="block size-(--product-card-swatch-size) rounded-full border border-(--product-card-border-color) bg-(--swatch-color) transition-shadow group-data-[available=false]/swatch:opacity-35 group-data-[active=true]/swatch:[box-shadow:0_0_0_1.5px_var(--product-card-bg),0_0_0_3px_var(--product-card-swatch-ring-color)]"
            >
                {hasImage ? (
                    // biome-ignore lint/performance/noImgElement: TODO.
                    <img
                        src={value.swatch!.image!.url}
                        alt=""
                        className="size-full rounded-full object-cover"
                        draggable={false}
                    />
                ) : null}
                {!value.available ? (
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-0 size-full"
                    >
                        <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                    </svg>
                ) : null}
            </span>
        </button>
    );
};

Swatch.displayName = 'Nordcom.ProductOptions.Swatch';
export default Swatch;

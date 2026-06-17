'use client';

import type { OptionValueRendererProps } from '../types';

const SHARED_CHIP =
    'product-options-chip border-(color:var(--product-card-chip-border)) text-(length:var(--product-card-vendor-size)) text-(color:var(--product-card-chip-color)) data-[active=true]:border-(color:var(--product-card-chip-active-bg)) data-[active=true]:text-(color:var(--product-card-chip-active-color)) inline-flex shrink-0 select-none items-center justify-center rounded-md border bg-(--product-card-chip-bg) px-(--product-card-chip-padding-x) py-(--product-card-chip-padding-y) font-semibold data-[active=true]:bg-(--product-card-chip-active-bg)';

/**
 * Text chip for a single option value, reflecting selected and available states. Interactive by
 * default; pass `readOnly` to render a non-clickable indicator (the cart line reuses this exact
 * primitive so its variant chips match the product picker).
 *
 * @param props.value - Option value data including name, selected, and available flags.
 * @param props.onSelect - Callback invoked when the chip is clicked (ignored when `readOnly`).
 * @param props.readOnly - Render a `<span>` indicator instead of a selectable button.
 * @returns The chip element.
 */
const Chip = ({ value, onSelect, readOnly }: OptionValueRendererProps) => {
    if (readOnly) {
        return (
            <span
                data-active={value.selected ? 'true' : 'false'}
                data-available={value.available ? 'true' : 'false'}
                className={`${SHARED_CHIP} max-w-full`}
            >
                {/* Read-only chips (the cart line) clip an over-long value to keep the row from being
                 * pushed; the interactive picker keeps full labels. */}
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{value.name}</span>
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={value.selected}
            aria-disabled={!value.available}
            data-active={value.selected ? 'true' : 'false'}
            data-available={value.available ? 'true' : 'false'}
            className={`${SHARED_CHIP} hover:border-(color:var(--accent)) cursor-pointer transition-[background-color,border-color,transform] hover:bg-(--accent-soft) focus-visible:outline-none focus-visible:outline-offset-2 data-[available=false]:cursor-not-allowed data-[available=false]:line-through data-[available=false]:opacity-50 motion-safe:active:scale-[0.97] focus-visible:[outline:2px_solid_var(--focus-ring)]`}
            style={{ touchAction: 'manipulation', userSelect: 'none' }}
        >
            {value.name}
        </button>
    );
};

Chip.displayName = 'Nordcom.ProductOptions.Chip';
export default Chip;

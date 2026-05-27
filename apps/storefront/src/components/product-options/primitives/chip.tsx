'use client';

import type { OptionValueRendererProps } from '../types';

/**
 * Text chip button for a single option value, reflecting selected and available states.
 *
 * @param props.value - Option value data including name, selected, and available flags.
 * @param props.onSelect - Callback invoked when the chip is clicked.
 * @returns The chip button element.
 */
const Chip = ({ value, onSelect }: OptionValueRendererProps) => (
    <button
        type="button"
        onClick={onSelect}
        aria-pressed={value.selected}
        data-active={value.selected ? 'true' : 'false'}
        data-available={value.available ? 'true' : 'false'}
        className="product-options-chip border-(color:var(--product-card-chip-border)) text-(length:var(--product-card-vendor-size)) text-(color:var(--product-card-chip-color)) data-[active=true]:border-(color:var(--product-card-chip-active-bg)) data-[active=true]:text-(color:var(--product-card-chip-active-color)) hover:border-(color:var(--accent)) inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-md border bg-(--product-card-chip-bg) px-(--product-card-chip-padding-x) py-(--product-card-chip-padding-y) font-semibold transition-[background-color,border-color,transform] hover:bg-(--accent-soft) focus-visible:outline-none focus-visible:outline-offset-2 data-[available=false]:cursor-not-allowed data-[active=true]:bg-(--product-card-chip-active-bg) data-[available=false]:line-through data-[available=false]:opacity-50 motion-safe:active:scale-[0.97] focus-visible:[outline:2px_solid_var(--accent)]"
        style={{ touchAction: 'manipulation', userSelect: 'none' }}
    >
        {value.name}
    </button>
);

Chip.displayName = 'Nordcom.ProductOptions.Chip';
export default Chip;

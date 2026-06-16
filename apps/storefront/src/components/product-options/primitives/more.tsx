'use client';

import { useProductOptions } from '../context';

/**
 * Shared chassis for the option-overflow control — the `More` pill and every "show all" trigger the
 * {@link Overlay} renders (SSR placeholder, desktop popover, mobile sheet). Kept in one place so the
 * four call sites can't drift apart. Every value resolves from the `--product-card-more-*` tokens.
 */
export const MORE_BUTTON_CLASS =
    'product-options-more text-(length:--product-card-more-size) text-(color:var(--product-card-more-color)) inline-flex min-h-(--product-card-more-min-size) min-w-(--product-card-more-min-size) cursor-pointer select-none items-center justify-center rounded-full bg-(--product-card-more-bg) px-2 font-(--product-card-more-weight) transition-[background-color,transform] hover:bg-[color-mix(in_srgb,var(--product-card-more-bg)_96%,black_4%)] focus-visible:outline-none motion-safe:active:scale-[0.97] motion-safe:hover:scale-[1.03] focus-visible:[outline:2px_solid_var(--accent)]';

export type MoreProps = {
    groupName: string;
    onClick?: () => void;
    className?: string;
};

/**
 * Overflow button showing a count of hidden option values beyond the first four.
 *
 * @param props.groupName - Option group name used to count overflow values from context.
 * @param props.onClick - Callback invoked when the overflow button is clicked.
 * @param props.className - CSS class names applied to the button; uses a default pill style when omitted.
 * @returns The overflow count button, or `null` when the group is not found or has no overflow.
 */
const More = ({ groupName, onClick, className }: MoreProps) => {
    const { resolved } = useProductOptions();
    const group = resolved.find((g) => g.name === groupName);
    if (!group) return null;
    const overflow = Math.max(0, group.values.length - 4);
    if (overflow === 0) return null;
    return (
        <button
            type="button"
            onClick={onClick}
            data-option-more
            aria-label={`Show all ${groupName} options`}
            className={className ?? MORE_BUTTON_CLASS}
            style={{ touchAction: 'manipulation', userSelect: 'none' }}
        >
            +{overflow}
        </button>
    );
};

More.displayName = 'Nordcom.ProductOptions.More';
export default More;

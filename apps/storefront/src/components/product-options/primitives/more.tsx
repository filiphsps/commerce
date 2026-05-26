'use client';

import { useProductOptions } from '../context';

export type MoreProps = {
    groupName: string;
    onClick?: () => void;
    className?: string;
};

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
            className={
                className ??
                'product-options-more text-(length:--product-card-more-size) text-(color:var(--product-card-more-color)) inline-flex min-h-(--product-card-more-min-size) min-w-(--product-card-more-min-size) cursor-pointer items-center justify-center rounded-full bg-(--product-card-more-bg) px-2 font-(--product-card-more-weight) transition-transform focus-visible:outline-none motion-safe:active:scale-95 focus-visible:[outline:2px_solid_var(--accent)]'
            }
        >
            +{overflow}
        </button>
    );
};

More.displayName = 'Nordcom.ProductOptions.More';
export default More;

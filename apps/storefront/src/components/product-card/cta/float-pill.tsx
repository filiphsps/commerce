'use client';

import { Plus, X } from 'lucide-react';
import { cn } from '@/utils/tailwind';
import type { ProductCardCtaProps } from './types';

/**
 * Floating pill CTA button rendered in the product card image corner.
 *
 * @param props.isSingleBuyable - When `true`, tapping adds the item directly without opening the picker.
 * @param props.isOpen - Whether the variant picker is currently open.
 * @param props.onActivate - Callback to toggle the picker open state.
 * @param props.onAdd - Callback invoked when the fast-path add-to-bag action is triggered.
 * @returns The circular pill button element.
 */
const FloatPill = ({ isSingleBuyable, isOpen, onActivate, onAdd }: ProductCardCtaProps) => {
    const handleClick = () => {
        if (isOpen) {
            onActivate();
            return;
        }
        if (isSingleBuyable) {
            onAdd();
            return;
        }
        onActivate();
    };

    const label = isOpen ? 'Close options' : isSingleBuyable ? 'Add to bag' : 'Choose options';

    return (
        <button
            type="button"
            aria-label={label}
            aria-expanded={isOpen}
            onClick={handleClick}
            {...(isSingleBuyable && !isOpen ? { 'data-fast-path': '' } : {})}
            className={cn(
                'absolute z-3',
                'top-(--product-card-cta-pill-top,10px) right-(--product-card-cta-pill-right,10px)',
                'inline-flex items-center justify-center gap-1.5',
                'size-9 rounded-full p-0',
                'bg-white/95 text-(--product-card-title-color)',
                'border border-[color-mix(in_srgb,currentColor_8%,transparent)]',
                'shadow-[0_6px_16px_-8px_rgb(20_17_11/0.25)]',
                'select-none [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]',
                'transition-[box-shadow,transform] duration-(--product-card-motion-base) ease-(--product-card-motion-ease)',
                'motion-safe:hover:shadow-[0_10px_22px_-8px_rgb(20_17_11/0.3)]',
                'motion-safe:active:scale-96 motion-safe:active:duration-(--product-card-motion-fast)',
                'focus:outline-none focus-visible:outline-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
                'data-[fast-path]:relative',
                "data-[fast-path]:after:content-['']",
                'data-[fast-path]:after:absolute data-[fast-path]:after:-right-px data-[fast-path]:after:-bottom-px',
                'data-[fast-path]:after:size-2.5 data-[fast-path]:after:rounded-full',
                'data-[fast-path]:after:border-(--product-card-bg) data-[fast-path]:after:border-2 data-[fast-path]:after:bg-(--product-card-fast-path-dot)',
            )}
        >
            {isOpen ? <X aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
        </button>
    );
};

FloatPill.displayName = 'Nordcom.ProductCard.Cta.FloatPill';

export default FloatPill;

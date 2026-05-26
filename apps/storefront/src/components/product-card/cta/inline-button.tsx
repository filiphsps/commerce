'use client';

import { registerProductCardCta } from './registry';
import type { ProductCardCtaProps } from './types';

/**
 * Inline-button CTA strategy. Renders a full-width 44px button below the
 * card body. Single-buyable products fast-path straight to onAdd; otherwise
 * the click delegates to onActivate so the host can open a picker.
 *
 * @param props - {@link ProductCardCtaProps}.
 * @returns The inline button element.
 */
const InlineButton = ({ isSingleBuyable, onActivate, onAdd }: ProductCardCtaProps) => {
    const handleClick = () => (isSingleBuyable ? onAdd() : onActivate());

    return (
        <button
            type="button"
            onClick={handleClick}
            className="inline-flex h-11 w-full cursor-pointer select-none items-center justify-center rounded-(--block-border-radius-small) border-0 bg-(--product-card-cta-bg) px-4 font-semibold text-(--product-card-cta-color) text-sm leading-none transition-[background,transform] duration-(--product-card-motion-base) ease-(--product-card-motion-ease) [-webkit-tap-highlight-color:transparent] [touch-action:manipulation] focus:outline-none focus-visible:outline-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 motion-safe:active:scale-99 motion-safe:active:duration-(--product-card-motion-fast) motion-safe:hover:bg-[color-mix(in_srgb,var(--product-card-cta-bg)_92%,white_8%)]"
        >
            Add to bag
        </button>
    );
};

InlineButton.displayName = 'Nordcom.ProductCard.Cta.InlineButton';

registerProductCardCta('inline-button', InlineButton);
export default InlineButton;

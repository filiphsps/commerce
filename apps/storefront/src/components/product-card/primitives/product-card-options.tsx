'use client';

import { getProductOptions, mapSelectedProductOptionToObject } from '@shopify/hydrogen-react';
import { useMemo, useRef, useState } from 'react';
import type { ProductVariant } from '@/api/product';
import { useProductCardContext } from '@/components/product-card/context';
import ProductCardOverlay from '@/components/product-card/primitives/product-card-overlay';
import { ProductOptionsSelector, type SelectedOptions } from '@/components/product-options-selector';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { hasProductOptions } from '@/utils/has-product-options';
import { cn } from '@/utils/tailwind';
import { unsafe_cast } from '@/utils/unsafe-cast';

const INLINE_LIMITS: Record<string, { mobile: number; desktop: number }> = {
    'vertical-boxed': { mobile: 3, desktop: 4 },
    'vertical-bare': { mobile: 3, desktop: 4 },
    'horizontal-boxed': { mobile: 4, desktop: 6 },
    'horizontal-bare': { mobile: 4, desktop: 6 },
    micro: { mobile: 0, desktop: 0 },
};

export type ProductCardOptionsProps = {
    className?: string;
};

const ProductCardOptions = ({ className }: ProductCardOptionsProps) => {
    const { data: product, variant, selected, setSelected, setHoveredImage } = useProductCardContext();

    const seed = selected ?? firstAvailableVariant(product);
    const [optionState, setOptionState] = useState<SelectedOptions>(() =>
        mapSelectedProductOptionToObject((seed?.selectedOptions ?? []) as Array<{ name: string; value: string }>),
    );

    const [overlayOpenFor, setOverlayOpenFor] = useState<string | null>(null);
    const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // getProductOptions expects RecursivePartial<Product>; our local Product is
    // a stricter superset that satisfies the runtime contract.
    const mappedOptions = useMemo(() => (product ? getProductOptions(unsafe_cast(product)) : []), [product]);

    if (!hasProductOptions(product) || variant === 'micro') {
        return null;
    }

    const inline = INLINE_LIMITS[variant] ?? INLINE_LIMITS['vertical-boxed']!;

    const handleChange = (next: SelectedOptions) => {
        setOptionState(next);
        const changed = Object.entries(next).find(([k, v]) => optionState[k] !== v);
        if (!changed) return;
        const [name, value] = changed;
        const valueEntry = mappedOptions.find((o) => o.name === name)?.optionValues.find((v) => v.name === value);
        if (valueEntry?.variant) {
            // getProductOptions returns hydrogen-react's ProductVariant (RecursivePartial);
            // our local ProductVariant is the stricter superset the runtime satisfies.
            setSelected(() => unsafe_cast<ProductVariant>(valueEntry.variant));
        }
    };

    return (
        <div className={cn('flex w-full flex-col gap-1', className)}>
            {mappedOptions.map((option) => {
                const total = option.optionValues.length;
                const limit = inline.desktop;
                const inlineCount = total > limit ? limit - 1 : total;
                const visible = option.optionValues.slice(0, inlineCount);
                const overflow = total - inlineCount;

                return (
                    <div
                        key={option.name}
                        className="relative flex flex-wrap items-center gap-(--product-card-swatch-gap)"
                    >
                        <ProductOptionsSelector
                            options={[{ ...option, optionValues: visible }]}
                            selectedOptions={optionState}
                            onChange={handleChange}
                            density="compact"
                            className="inline-flex w-fit shrink flex-wrap items-end justify-start gap-(--product-card-swatch-gap)"
                        />

                        {overflow > 0 ? (
                            <button
                                ref={(el) => {
                                    triggerRefs.current[option.name] = el;
                                }}
                                type="button"
                                onClick={() => setOverlayOpenFor(option.name)}
                                aria-haspopup="dialog"
                                aria-expanded={overlayOpenFor === option.name}
                                aria-label={`Show all ${option.name} options`}
                                className={cn(
                                    'inline-flex h-(--product-card-swatch-size) min-w-(--product-card-swatch-size) items-center justify-center px-1.5',
                                    'rounded-full bg-(--product-card-more-bg)',
                                    'text-(length:--product-card-more-size) text-(--product-card-more-color)',
                                    'font-(--product-card-more-weight)',
                                    'transition-transform active:scale-95',
                                )}
                            >
                                +{overflow}
                            </button>
                        ) : null}

                        {overlayOpenFor === option.name ? (
                            <ProductCardOverlay
                                open
                                onOpenChange={(open) => setOverlayOpenFor(open ? option.name : null)}
                                label={option.name}
                                anchorRef={{ current: triggerRefs.current[option.name] }}
                            >
                                <ProductOptionsSelector
                                    options={[option]}
                                    selectedOptions={optionState}
                                    onChange={(next) => {
                                        handleChange(next);
                                        setOverlayOpenFor(null);
                                    }}
                                    density="spacious"
                                    className="grid grid-cols-1 gap-1"
                                />
                            </ProductCardOverlay>
                        ) : null}

                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0"
                            onMouseLeave={() => setHoveredImage(undefined)}
                        />
                    </div>
                );
            })}
        </div>
    );
};

ProductCardOptions.displayName = 'Nordcom.ProductCard.Options';
export default ProductCardOptions;

'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { ConvertToLocalMeasurementSystem } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

import type { Product, ProductVariant } from '@/api/product';
import type { Locale } from '@/utils/locale';

export type ProductCardOptionsProps = {
    locale: Locale;
    data: Product;
    selectedVariant: ProductVariant;
    setSelectedVariant(variant: ProductVariant): void;
};

const ProductCardOptions = ({
    locale,
    data: {
        variants: { edges: variants }
    },
    selectedVariant,
    setSelectedVariant
}: ProductCardOptionsProps) => {
    if (
        !selectedVariant ||
        !variants ||
        variants.length <= 1 ||
        // If we only have two variants and the non-default one is out of stock, we don't need to show the variant selector.
        (variants.length === 2 &&
            variants.some(({ node: { id, availableForSale } }) => id !== selectedVariant.id && !availableForSale))
    ) {
        return null;
    }

    // TODO: Use options rather than variants.
    return (
        <div className={cn(styles.variants, 'mt-6 flex flex-wrap gap-2')}>
            {variants.map(({ node: variant }, index) => {
                if (index >= 3) return null; //TODO: handle more than 3 variants on the card.

                let title = variant.title;
                if (
                    variant.selectedOptions.length === 1 &&
                    variant.selectedOptions[0]!.name === 'Size' &&
                    variant.weight &&
                    variant.weightUnit
                ) {
                    title = ConvertToLocalMeasurementSystem({
                        locale: locale,
                        weight: variant.weight,
                        weightUnit: variant.weightUnit
                    });
                }

                const isSelected = selectedVariant && selectedVariant.id === variant.id;

                return (
                    <button
                        key={variant.id}
                        title={variant.selectedOptions.map((i) => `${i.name}: ${i.value}`).join(', ')}
                        onClick={() => setSelectedVariant(variant)}
                        className={cn(
                            styles.variant,
                            'hover:text-primary-foreground hover:bg-primary rounded-lg bg-white px-3 py-1 text-sm font-medium text-gray-600 transition-all hover:shadow-lg',
                            isSelected && 'font-bold'
                        )}
                        data-active={isSelected}
                    >
                        {title}
                    </button>
                );
            })}
        </div>
    );
};

ProductCardOptions.displayName = 'Nordcom.ProductCard.Options';
export default ProductCardOptions;

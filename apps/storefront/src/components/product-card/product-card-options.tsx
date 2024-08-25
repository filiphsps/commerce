'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { type Product, type ProductVariant } from '@/api/product';
import { ConvertToLocalMeasurementSystem } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

import type { Locale } from '@/utils/locale';

export type ProductCardOptionsProps = {
    locale: Locale;
    data: Product;
    selectedVariant?: ProductVariant | undefined;
    setSelectedVariant(variant: ProductVariant): void;
};

const ProductCardOptions = ({
    locale,
    data: product,
    selectedVariant = undefined,
    setSelectedVariant
}: ProductCardOptionsProps) => {
    const {
        variants: { edges: variants }
    } = product;

    if (!selectedVariant || (!variants as any)) {
        return null;
    }

    if (
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
                if (index >= 3) {
                    return null; //TODO: handle more than 3 variants on the card.
                }

                let title = variant.title;
                if (title.length > 10) {
                    return null;
                }

                if (
                    variant.selectedOptions.length === 1 &&
                    variant.selectedOptions[0]!.name === 'Size' &&
                    variant.weight &&
                    !!(variant as any).weightUnit
                ) {
                    title = ConvertToLocalMeasurementSystem({
                        locale: locale,
                        weight: variant.weight,
                        weightUnit: variant.weightUnit
                    });
                }

                const isSelected = (selectedVariant as any)?.id === variant.id;

                const Tag = isSelected ? 'div' : 'button';
                return (
                    <Tag
                        key={variant.id}
                        title={variant.selectedOptions.map((i) => `${i.name}: ${i.value}`).join(', ')}
                        onClick={() => {
                            if (isSelected) return;
                            setSelectedVariant(variant);
                        }}
                        className={cn(
                            styles.variant,
                            'hover:border-primary flex h-8 select-none items-center justify-center rounded-lg border-2 border-solid border-white bg-white px-3 py-0 text-sm font-semibold text-gray-600 transition-all',
                            isSelected && 'border-primary text-primary',
                            !isSelected && 'cursor-pointer hover:shadow-lg'
                        )}
                        data-active={isSelected}
                    >
                        {title}
                    </Tag>
                );
            })}
        </div>
    );
};

ProductCardOptions.displayName = 'Nordcom.ProductCard.Options';
export default ProductCardOptions;

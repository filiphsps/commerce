'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { ConvertToLocalMeasurementSystem } from '@/utils/locale';

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
    data: product,
    selectedVariant,
    setSelectedVariant
}: ProductCardOptionsProps) => {
    if (!selectedVariant || (product.variants.edges.length || 0) <= 1) return null;

    // TODO: Use options rather than variants.
    return (
        <div className={styles.variants}>
            {product.variants.edges &&
                product.variants.edges.length > 1 &&
                product.variants.edges.map((edge, index) => {
                    if (!edge.node || index >= 3) return null; //TODO: handle more than 3 variants on the card.
                    const variant = edge.node! as ProductVariant;
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

                    return (
                        <button
                            key={variant.id}
                            title={variant.selectedOptions.map((i) => `${i.name}: ${i.value}`).join(', ')}
                            onClick={() => setSelectedVariant(variant)}
                            className={styles.variant}
                            data-active={selectedVariant.id === variant.id}
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

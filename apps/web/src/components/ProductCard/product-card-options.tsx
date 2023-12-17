'use client';

import type { ProductVariant } from '@/api/product';
import styles from '@/components/ProductCard/product-card.module.scss';
import { useShop } from '@/components/shop/provider';
import { deepEqual } from '@/utils/deep-equal';
import { ConvertToLocalMeasurementSystem, type LocaleDictionary } from '@/utils/locale';
import { useProduct } from '@shopify/hydrogen-react';
import { memo } from 'react';

export type ProductCardOptionsProps = {
    i18n: LocaleDictionary;
};

const ProductCardOptions = memo(({}: ProductCardOptionsProps) => {
    const { selectedVariant, setSelectedVariant, product } = useProduct();
    const { locale } = useShop();

    if (!selectedVariant || (product?.variants?.edges?.length || 0) <= 1) return null;

    // TODO: Use options rather than variants.
    return (
        <div className={styles.variants}>
            {product?.variants?.edges &&
                product?.variants.edges.length > 1 &&
                product?.variants.edges.map((edge, index) => {
                    if (!edge?.node || index >= 3) return null; //TODO: handle more than 3 variants on the card.
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
}, deepEqual);

ProductCardOptions.displayName = 'Nordcom.ProductCard.Options';
export default ProductCardOptions;

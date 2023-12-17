'use client';

import styles from '@/components/ProductCard/product-card.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import type { LocaleDictionary } from '@/utils/locale';
import { useProduct } from '@shopify/hydrogen-react';
import { memo } from 'react';

export type ProductCardBadgesProps = {
    i18n: LocaleDictionary;
};

const ProductCardBadges = memo(({}: ProductCardBadgesProps) => {
    const { selectedVariant, product } = useProduct();

    if (!selectedVariant) return null;

    const isNewProduct =
        product?.createdAt &&
        Math.abs(new Date(product?.createdAt).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000) < 15; // TODO: Do this properly through a tag or similar.
    const isVegan = product?.tags?.includes('Vegan');
    const isSale = !!selectedVariant?.compareAtPrice?.amount;

    let discount = 0;
    if (isSale && selectedVariant) {
        const compare = Number.parseFloat(selectedVariant.compareAtPrice!.amount!);
        const current = Number.parseFloat(selectedVariant.price!.amount!);
        discount = Math.round((100 * (compare - current)) / compare);
    }

    return (
        <>
            {discount > 1 && ( // Handle rounding-errors.
                <div className={styles.badge} data-variant="discount">
                    <b>{discount}%</b> OFF
                </div>
            )}

            {isNewProduct || isVegan ? (
                <div className={styles.badges}>
                    {isNewProduct && (
                        <div className={styles.badge} data-variant="new">
                            New!
                        </div>
                    )}
                    {isVegan && (
                        <div className={styles.badge} data-variant="vegan">
                            Vegan
                        </div>
                    )}
                </div>
            ) : null}
        </>
    );
}, deepEqual);

ProductCardBadges.displayName = 'Nordcom.ProductCard.Badges';
export default ProductCardBadges;

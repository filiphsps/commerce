import styles from '@/components/product-card/product-card.module.scss';

import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { useTranslation } from '@/utils/locale';

import type { Product } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardBadgesProps = {
    data: Product;
    i18n: LocaleDictionary;
};

const ProductCardBadges = ({ data: product, i18n }: ProductCardBadgesProps) => {
    const selectedVariant = FirstAvailableVariant(product);
    const { t } = useTranslation('product', i18n);

    if (!selectedVariant) return null;

    const isNewProduct =
        product.createdAt &&
        Math.abs(new Date(product.createdAt).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000) < 15; // TODO: Do this properly through a tag or similar.
    const isVegan = product.tags.includes('Vegan');
    const isSale = !!selectedVariant.compareAtPrice?.amount;

    let discount = 0;
    if (isSale && selectedVariant) {
        const compare = Number.parseFloat(selectedVariant.compareAtPrice!.amount!);
        const current = Number.parseFloat(selectedVariant.price!.amount!);
        discount = Math.round((100 * (compare - current)) / compare);
    }
    const shouldShowBadge = isNewProduct || isVegan;

    return (
        <>
            {discount > 1 ? ( // Handle rounding-errors.
                <div className={styles.badge} data-variant="discount" data-nosnippet={true}>
                    {t('percentage-off', discount)}
                </div>
            ) : null}

            {shouldShowBadge ? (
                <div className={styles.badges}>
                    {isNewProduct && (
                        <div className={styles.badge} data-variant="new" data-nosnippet={true}>
                            {t('new')}
                        </div>
                    )}

                    {isVegan && (
                        <div className={styles.badge} data-variant="vegan">
                            {t('vegan')}
                        </div>
                    )}
                </div>
            ) : null}
        </>
    );
};

ProductCardBadges.displayName = 'Nordcom.ProductCard.Badges';
export default ProductCardBadges;

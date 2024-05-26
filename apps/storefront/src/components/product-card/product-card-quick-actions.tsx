import styles from '@/components/product-card/product-card.module.scss';

import { FiHeart } from 'react-icons/fi';

import { useTranslation } from '@/utils/locale';

import type { Product } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ProductCardQuickActionsProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    data: Product;
};

const ProductCardQuickActions = ({ i18n, data: product }: ProductCardQuickActionsProps) => {
    const { t } = useTranslation('product', i18n);

    return (
        <div className={styles['quick-actions']}>
            <button className={styles.action} data-type="wishlist" title={t('add-to-wishlist')}>
                <FiHeart />
            </button>
        </div>
    );
};

ProductCardQuickActions.displayName = 'Nordcom.ProductCard.QuickActions';
export default ProductCardQuickActions;

import type { Product } from '@/api/product';
import styles from '@/components/products/info-lines.module.scss';
import { Label } from '@/components/typography/label';
import type { FunctionComponent } from 'react';
import { FiPackage } from 'react-icons/fi';

interface StockStatusProps {
    product?: Product;
}
export const StockStatus: FunctionComponent<StockStatusProps> = ({ product }) => {
    if (!product || !product.availableForSale) return null;

    // TODO: Proper i18n.
    const available = `In stock and available`;

    return (
        <section className={styles.item} data-status={'available'} title={available}>
            <div className={styles.icon}>
                <FiPackage />
            </div>
            <Label>{available}</Label>
        </section>
    );
};

interface InfoLinesProps {
    product: Product;
}
export const InfoLines: FunctionComponent<InfoLinesProps> = ({ product }) => {
    if (!product) return null;

    return (
        <div className={styles.container}>
            <StockStatus product={product} />
        </div>
    );
};

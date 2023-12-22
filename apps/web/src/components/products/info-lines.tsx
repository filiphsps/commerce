import type { Product } from '@/api/product';
import styles from '@/components/products/info-lines.module.scss';
import { Label } from '@/components/typography/label';
import { FiPackage } from 'react-icons/fi';

export type StockStatusProps = {
    product?: Product;
};
const StockStatus = ({ product }: StockStatusProps) => {
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
StockStatus.displayName = 'Nordcom.Products.StockStatus';

export type InfoLinesProps = {
    product?: Product;
};
const InfoLines = ({ product }: InfoLinesProps) => {
    if (!product) return null;

    return (
        <div className={styles.container}>
            <StockStatus product={product} />
        </div>
    );
};
InfoLines.displayName = 'Nordcom.Products.InfoLines';

export { InfoLines, StockStatus };

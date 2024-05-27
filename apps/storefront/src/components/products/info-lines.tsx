import styles from '@/components/products/info-lines.module.scss';

import { FiPackage } from 'react-icons/fi';

import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';

export type StockStatusProps = {
    product?: Product;
};
const StockStatus = ({ product }: StockStatusProps) => {
    if (!product || !product.availableForSale) return null;

    // TODO: Proper i18n.
    const available = `In stock and available`;

    return (
        <section className={styles.item} data-status={'available'} title={available}>
            <FiPackage className={styles.icon} />
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

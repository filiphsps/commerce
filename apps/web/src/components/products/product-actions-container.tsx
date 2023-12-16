'use client';

import type { Product, ProductVariant } from '@/api/product';
import AddToCart from '@/components/products/add-to-cart';
import { InfoLines } from '@/components/products/info-lines';
import styles from '@/components/products/product-actions-container.module.scss';
import { ProductOptions } from '@/components/products/product-options';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';
import type { LocaleDictionary } from '@/utils/locale';
import { Locale, useTranslation } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import { useState, type HTMLProps } from 'react';

export type ProductActionsContainerProps = {
    i18n: LocaleDictionary;
    product?: Product;
    initialVariant: ProductVariant;
    selectedVariant?: ProductVariant;
} & HTMLProps<HTMLDivElement>;

export const ProductActionsContainer = ({
    className,
    i18n,
    product,
    initialVariant,
    selectedVariant,
    children,
    ...props
}: ProductActionsContainerProps) => {
    const { t } = useTranslation('common', i18n);
    const [quantity, setQuantity] = useState(1);
    const locale = Locale.current;

    return (
        <ProductProvider data={product as any} initialVariantId={selectedVariant?.id || initialVariant.id}>
            <section {...props} className={`${styles.options} ${className || ''}`}>
                <Label style={{ gridArea: 'quantity-label' }}>{t('quantity')}</Label>

                <QuantitySelector
                    update={(n) => setQuantity(n)}
                    value={quantity}
                    i18n={i18n}
                    style={{ gridArea: 'quantity' }}
                />
                <ProductOptions
                    locale={locale}
                    initialVariant={initialVariant}
                    selectedVariant={selectedVariant || initialVariant}
                    style={{ gridArea: 'options' }}
                />
            </section>

            <AddToCart className={styles.button} quantity={quantity} i18n={i18n} />
            {(product && <InfoLines product={product} />) || null}

            {children}
        </ProductProvider>
    );
};

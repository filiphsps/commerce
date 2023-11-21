'use client';

import { AddToCart } from '@/components/products/add-to-cart';
import styles from '@/components/products/product-actions-container.module.scss';
import { ProductOptions } from '@/components/products/product-options';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { Product, ProductVariant } from '@shopify/hydrogen-react/storefront-api-types';
import { useState, type HTMLProps } from 'react';

export type ProductActionsContainerProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    product?: Product;
    initialVariant: ProductVariant;
    selectedVariant?: ProductVariant;
} & HTMLProps<HTMLDivElement>;

export const ProductActionsContainer = ({
    className,
    locale,
    i18n,
    product,
    initialVariant,
    selectedVariant,
    children,
    ...props
}: ProductActionsContainerProps) => {
    const { t } = useTranslation('common', i18n);
    const [quantity, setQuantity] = useState(1);

    return (
        <ProductProvider data={product!} initialVariantId={selectedVariant?.id || initialVariant.id}>
            <section {...props} className={`${styles.options} ${className || ''}`}>
                <Label style={{ gridArea: 'quantity-label' }}>{t('quantity')}</Label>

                <QuantitySelector
                    update={(n) => setQuantity(n)}
                    value={quantity}
                    locale={locale}
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

            <AddToCart className={styles.button} quantity={quantity} locale={locale} i18n={i18n} />
        </ProductProvider>
    );
};

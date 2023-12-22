'use client';

import type { Product, ProductVariant } from '@/api/product';
import AddToCart from '@/components/products/add-to-cart';
import styles from '@/components/products/product-actions-container.module.scss';
import { ProductOptions } from '@/components/products/product-options';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';
import type { LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import { Suspense, useState, type HTMLProps } from 'react';

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
    const { locale } = useShop();
    const { t } = useTranslation('common', i18n);
    const [quantity, setQuantity] = useState(1);

    return (
        <ProductProvider data={product as any} initialVariantId={selectedVariant?.id || initialVariant.id}>
            <div {...props} className={`${styles.options} ${className || ''}`}>
                <Label style={{ gridArea: 'quantity-label' }}>{t('quantity')}</Label>

                <QuantitySelector
                    update={(value) => {
                        if (value === quantity) return;
                        setQuantity(value);
                    }}
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
            </div>

            <Suspense>
                <AddToCart className={styles.button} quantity={quantity} i18n={i18n} />
            </Suspense>

            <Suspense>{children}</Suspense>
        </ProductProvider>
    );
};

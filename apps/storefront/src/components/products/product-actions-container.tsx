'use client';

import styles from '@/components/products/product-actions-container.module.scss';

import { type HTMLProps, Suspense, useState } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { useTranslation } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';

import AddToCart from '@/components/products/add-to-cart';
import { ProductOptions } from '@/components/products/product-options';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';

import { ProductQuantityBreaks } from './product-quantity-breaks';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductActionsContainerProps = {
    shop: Shop;
    i18n: LocaleDictionary;
    product?: Product;
    initialVariant: ProductVariant;
    selectedVariant?: ProductVariant;
} & HTMLProps<HTMLDivElement>;

export const ProductActionsContainer = ({
    shop,
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

                <Suspense key={`${shop.id}.${product?.id}.product-actions.options`}>
                    <ProductOptions locale={locale} initialVariant={initialVariant} style={{ gridArea: 'options' }} />
                </Suspense>
            </div>

            <Suspense key={`${shop.id}.${product?.id}.product-actions.quantity-breaks`}>
                <ProductQuantityBreaks locale={locale} currentQuantity={quantity} />
            </Suspense>

            <Suspense key={`${shop.id}.${product?.id}.product-actions.add-to-cart`}>
                <AddToCart locale={locale} className={styles.button} quantity={quantity} i18n={i18n} />
            </Suspense>

            <Suspense key={`${shop.id}.${product?.id}.product-actions.content`}>{children}</Suspense>
        </ProductProvider>
    );
};

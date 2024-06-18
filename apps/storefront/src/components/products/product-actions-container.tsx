'use client';

import styles from '@/components/products/product-actions-container.module.scss';

import { Suspense, useState } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { useTranslation } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';

import AddToCart from '@/components/products/add-to-cart';
import { ProductOptions } from '@/components/products/product-options';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';

import { QuantityProvider } from './quantity-provider';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { HTMLProps } from 'react';

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
    const { t } = useTranslation('common', i18n);
    const [quantity, setQuantity] = useState(1);

    // Make sure product actually exists.
    if (!product) return null; // TODO: Add loading shimmer/placeholder.

    return (
        <ProductProvider data={product as any} initialVariantId={selectedVariant?.id || initialVariant.id}>
            <QuantityProvider quantity={quantity} setQuantity={setQuantity}>
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

                    <Suspense
                        key={`${shop.id}.${product.id}.product-actions.options`}
                        fallback={<ProductOptions.skeleton />}
                    >
                        <ProductOptions initialVariant={initialVariant} style={{ gridArea: 'options' }} />
                    </Suspense>
                </div>

                {/*<ProductQuantityBreaks />*/}

                <Suspense
                    key={`${shop.id}.${product.id}.product-actions.add-to-cart`}
                    fallback={<AddToCart.skeleton />}
                >
                    <AddToCart className={styles.button} quantity={quantity} i18n={i18n} />
                </Suspense>

                {children}
            </QuantityProvider>
        </ProductProvider>
    );
};
ProductActionsContainer.displayName = 'Nordcom.Products.ActionsContainer';

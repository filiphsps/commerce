'use client';

import { AddToCart } from '@/components/products/add-to-cart';
import styles from '@/components/products/product-actions-container.module.scss';
import { ProductOptions } from '@/components/products/product-options';
import { QuantitySelector } from '@/components/products/quantity-selector';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { Product, ProductVariant } from '@shopify/hydrogen-react/storefront-api-types';
import { useState, type HTMLProps } from 'react';
import { InfoLines } from './InfoLines';

export type ProductActionsContainerProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    product?: Product;
    initialVariant: ProductVariant;
    selectedVariant?: ProductVariant;
} & HTMLProps<HTMLDivElement>;

export const ProductActionsContainer = (props: ProductActionsContainerProps) => {
    const { className, locale, i18n, product, initialVariant, selectedVariant } = props;
    const { t } = useTranslation('common', i18n);
    const [quantity, setQuantity] = useState(1);

    return (
        <ProductProvider data={product!} initialVariantId={selectedVariant?.id || initialVariant.id}>
            <section
                {...RemoveInvalidProps({ ...props, children: undefined })}
                className={`${styles.container} ${className || ''}`}
            >
                <div className={styles.options}>
                    <label className={styles.label} style={{ gridArea: 'quantity-label' }}>
                        {t('quantity')}
                    </label>

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
                </div>
                <AddToCart quantity={quantity} locale={locale} i18n={i18n} />
                {(product && <InfoLines product={product} />) || null}
            </section>
        </ProductProvider>
    );
};

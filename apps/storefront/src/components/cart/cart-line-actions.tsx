'use client';

import { useCallback } from 'react';
import { CgTrash } from 'react-icons/cg';

import { type LocaleDictionary, useTranslation } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';

import { QuantitySelector } from '@/components/products/quantity-selector';

import type { Product, ProductVariant } from '@/api/product';
import type { CartLine as ShopifyCartLine } from '@shopify/hydrogen-react/storefront-api-types';

interface CartLineProps {
    i18n: LocaleDictionary;
    data: ShopifyCartLine;
}

const CartLineQuantityAction = ({ i18n, data: line }: CartLineProps) => {
    const { linesRemove, linesUpdate, cartReady } = useCart();

    const update = useCallback(
        (value: number) => {
            if (value === line.quantity) return;
            else if (!value) {
                linesRemove([line.id!]);
                return;
            }

            linesUpdate([
                {
                    id: line.id!,
                    quantity: value
                }
            ]);
        },
        [, line]
    );

    const product: Required<Product> | undefined = line.merchandise.product as any;
    const variant: Required<ProductVariant> | undefined = line.merchandise as any;
    if (!product || !variant) {
        console.error(`Product or product variant not found for line ${line.id}`);
        return null;
    }

    return (
        <QuantitySelector
            className="max-w-48 bg-gray-100"
            i18n={i18n}
            disabled={!cartReady}
            value={line.quantity}
            update={update}
            allowDecreaseToZero={true}
        />
    );
};

const CartLineRemoveAction = ({ i18n, data: line }: CartLineProps) => {
    const { linesRemove, cartReady } = useCart();

    const { t } = useTranslation('cart', i18n);

    const product: Required<Product> | undefined = line.merchandise.product as any;
    const variant: Required<ProductVariant> | undefined = line.merchandise as any;
    if (!product || !variant) {
        console.error(`Product or product variant not found for line ${line.id}`);
        return null;
    }

    return (
        <button
            aria-disabled={!cartReady}
            disabled={!cartReady}
            className={'appearance-none'}
            title={t('remove-from-cart', `${product.vendor} ${product.title} - ${variant.title}`)}
            onClick={() => linesRemove([line.id!])}
        >
            <CgTrash className="py-2 text-2xl hover:text-red-600" />
        </button>
    );
};

export { CartLineQuantityAction, CartLineRemoveAction };

'use client';

import type { Product, ProductVariant } from '@/api/product';
import { Button } from '@/components/actionable/button';
import styles from '@/components/cart/cart-line.module.scss';
import { QuantitySelector } from '@/components/products/quantity-selector';
import type { LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import type { CartLine as ShopifyCartLine } from '@shopify/hydrogen-react/storefront-api-types';
import { useCallback } from 'react';
import { CgTrash } from 'react-icons/cg';

interface CartLineProps {
    i18n: LocaleDictionary;
    data: ShopifyCartLine;
}
const CartLineActions = ({ i18n, data: line }: CartLineProps) => {
    const { linesRemove, linesUpdate, status } = useCart();

    const update = useCallback(
        (value: number) => {
            if (!value) {
                linesRemove([line.id!]);
                return;
            }

            if (value === line.quantity) return;

            linesUpdate([
                {
                    id: line.id!,
                    quantity: value
                }
            ]);
        },
        [line]
    );

    const product: Required<Product> = line.merchandise?.product! as any;
    const variant: Required<ProductVariant> = line.merchandise! as any;
    if (!product || !variant) {
        console.error(`Product or product variant not found for line ${line.id}`);
        return null;
    }

    return (
        <>
            <QuantitySelector
                className={styles.quantity}
                i18n={i18n}
                disabled={status !== 'idle'}
                value={line.quantity}
                update={update}
                allowDecreaseToZero={true}
            />

            <Button
                className={styles.remove}
                // TODO: i18n.
                title={`Remove "${product.vendor} ${product.title} - ${variant.title}" from the cart`}
                onClick={() => linesRemove([line.id!])}
            >
                <CgTrash />
            </Button>
        </>
    );
};

CartLineActions.displayName = 'Nordcom.Cart.Line.Actions';
export { CartLineActions };

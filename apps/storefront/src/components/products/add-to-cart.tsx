/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import styles from '@/components/products/add-to-cart.module.scss';

import { type HTMLProps, useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { TodoError } from '@nordcom/commerce-errors';

import { useTranslation } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { ShopifyPriceToNumber } from '@/utils/pricing';
import { useTrackable } from '@/utils/trackable';
import { useCart, useProduct } from '@shopify/hydrogen-react';
import { toast } from 'sonner';

import { Button } from '@/components/actionable/button';
import { useShop } from '@/components/shop/provider';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

export type AddToCartProps = {
    i18n: LocaleDictionary;
    quantity: number;

    data?: Product;
    variant?: ProductVariant;
} & Omit<HTMLProps<HTMLButtonElement>, 'data'>;

// eslint-disable-next-line unused-imports/no-unused-vars
const AddToCart = ({ i18n, className, quantity = 0, type, data, variant, ...props }: AddToCartProps) => {
    const { locale } = useShop();

    const queueEvent = useTrackable((context) => context.queueEvent);
    if (typeof queueEvent !== 'function') throw new TodoError('queueEvent is not a function');

    const { t } = useTranslation('common', i18n);
    const { t: tCart } = useTranslation('cart', i18n);
    const path = usePathname();

    const [animation, setAnimation] = useState<NodeJS.Timeout | undefined>();
    // This is a bit of a hack, but it works.
    const { selectedVariant, product } = data ? { selectedVariant: variant, product: data } : useProduct();
    const { cartReady, linesAdd, status } = useCart();
    const ready = cartReady && status !== 'updating';

    const add = useCallback(() => {
        if (!ready || !product || !selectedVariant) {
            // TODO: i18n.
            toast.warning(`The cart is still loading, please try again in a few seconds!`);
            return;
        }

        clearTimeout(animation);
        setAnimation(
            setTimeout(() => {
                clearTimeout(animation);
                setAnimation(() => undefined);
            }, 3000)
        );

        linesAdd([
            {
                merchandiseId: selectedVariant!.id!,
                quantity
            }
        ]);

        queueEvent('add_to_cart', {
            path,
            gtm: {
                ecommerce: {
                    currency: selectedVariant.price?.currencyCode!,
                    value: ShopifyPriceToNumber(0, selectedVariant.price?.amount) * quantity ?? undefined,
                    items: [
                        {
                            item_id: ProductToMerchantsCenterId({
                                locale,
                                product: {
                                    productGid: product!.id!,
                                    variantGid: selectedVariant!.id!
                                }
                            }),
                            item_name: product.title,
                            item_variant: selectedVariant.title,
                            item_brand: product.vendor,
                            item_category: product.productType,
                            product_id: product.id,
                            variant_id: selectedVariant.id,
                            sku: selectedVariant.sku || undefined,
                            currency: selectedVariant.price?.currencyCode!,
                            price: ShopifyPriceToNumber(undefined, selectedVariant.price?.amount!),
                            quantity: quantity ?? 0
                        }
                    ]
                }
            }
        });

        // TODO: Move the toast to the provider.
        // TODO: i18n.
        toast.success(
            <>
                <p>
                    Added{' '}
                    <b>
                        <span>{quantity}x</span> {selectedVariant!.title} - {product!.title}
                    </b>{' '}
                    to the cart!
                </p>
            </>
        );
    }, [linesAdd, selectedVariant, quantity, ready]);

    const [label, setLabel] = useState<string>(t('add-to-cart'));
    useEffect(() => {
        if (animation) {
            const newLabel = t('added-to-cart');

            // 1. Have we just successfully added to cart, if so, show a checkmark.
            if (label !== newLabel) setLabel(newLabel);
        } else if (!selectedVariant?.availableForSale) {
            const newLabel = t('out-of-stock');

            // 2. If out of stock, show the relevant label.
            if (label !== newLabel) setLabel(newLabel);
        } else if (!quantity || quantity < 1) {
            const newLabel = t('quantity-too-low');

            // 3. Quantity is either invalid or 0.
            if (label !== newLabel) setLabel(newLabel);
        } else {
            const newLabel = t('add-to-cart');

            // 4. Default state.
            if (label !== newLabel) setLabel(newLabel);
        }
    }, [animation, selectedVariant]);

    const disabled = !ready || !selectedVariant!.availableForSale || !quantity;

    return (
        <Button
            aria-disabled={disabled}
            aria-label={tCart('add-n-to-your-cart', quantity)}
            {...props}
            className={`${styles['add-to-cart']} ${className || ''}`}
            disabled={disabled}
            as="button"
            type={type || ('button' as const)}
            data-ready={ready}
            data-success={(animation && 'true') || undefined}
            onClick={add}
            title={tCart('add-n-to-your-cart', quantity)}
        >
            {label}
        </Button>
    );
};
AddToCart.displayName = 'Nordcom.Products.AddToCart';

AddToCart.skeleton = () => {
    return <Button disabled={true} className={`${styles['add-to-cart']}`} />;
};
(AddToCart.skeleton as any).displayName = 'Nordcom.Products.AddToCart.Skeleton';

export default AddToCart;

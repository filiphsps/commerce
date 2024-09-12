/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import styles from '@/components/products/add-to-cart.module.scss';

import { type HTMLProps, useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { useTrackable } from '@/utils/trackable';
import { useCart, useProduct } from '@shopify/hydrogen-react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/actionable/button';
import { useShop } from '@/components/shop/provider';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

const AddToCartSkeleton = () => {
    return <Button disabled={true} className={styles['add-to-cart']} />;
};
AddToCartSkeleton.displayName = 'Nordcom.Products.AddToCart.Skeleton';

export type AddToCartProps = {
    i18n: LocaleDictionary;
    quantity: number;

    data?: Product;
    variant?: ProductVariant;
} & Omit<HTMLProps<HTMLButtonElement>, 'data'>;

// eslint-disable-next-line unused-imports/no-unused-vars
const AddToCart = ({ children, className, i18n, quantity = 0, type, data, variant, ...props }: AddToCartProps) => {
    const { locale } = useShop();

    const { t } = useTranslation('common', i18n);
    const { t: tCart } = useTranslation('cart', i18n);
    const path = usePathname();

    const { queueEvent } = useTrackable();

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
                    value: safeParseFloat(0, selectedVariant.price?.amount) * quantity,
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
                            item_category: product.productType || undefined,
                            product_id: product.id,
                            variant_id: selectedVariant.id,
                            sku: selectedVariant.sku || undefined,
                            currency: selectedVariant.price?.currencyCode!,
                            price: safeParseFloat(undefined, selectedVariant.price?.amount!),
                            quantity
                        }
                    ]
                }
            }
        });

        clearTimeout(animation);

        setAnimation(
            setTimeout(() => {
                clearTimeout(animation);
                setAnimation(() => undefined);
            }, 3000)
        );
    }, [linesAdd, selectedVariant, quantity, ready]);

    const [label, setLabel] = useState<string>(t('add-to-cart'));
    useEffect(() => {
        if (children) return;

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

    const disabled = !ready || !selectedVariant?.availableForSale || !quantity;

    return (
        <Button
            aria-disabled={disabled || undefined}
            {...props}
            className={cn(className)}
            disabled={disabled || undefined}
            as="button"
            type={(type as any) || ('button' as const)}
            data-ready={ready || undefined}
            data-success={!!(animation as any) ? 'true' : undefined}
            onClick={add}
            title={tCart('add-n-to-your-cart', quantity)}
            data-nosnippet={true}
        >
            {children || label}
        </Button>
    );
};

AddToCart.displayName = 'Nordcom.Products.AddToCart';
AddToCart.skeleton = AddToCartSkeleton;
export default AddToCart;

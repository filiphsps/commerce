'use client';

import { Button } from '@/components/actionable/button';
import styles from '@/components/products/add-to-cart.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import type { LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { ShopifyPriceToNumber } from '@/utils/pricing';
import { useTrackable } from '@/utils/trackable';
import { useCart, useProduct } from '@shopify/hydrogen-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { memo, useState, type HTMLProps } from 'react';
import { toast } from 'sonner';
import { useShop } from '../shop/provider';

export type AddToCartProps = {
    i18n: LocaleDictionary;
    quantity: number;
    showIcon?: boolean;
} & HTMLProps<HTMLButtonElement>;

// eslint-disable-next-line unused-imports/no-unused-vars
const AddToCart = ({ i18n, className, quantity = 0, showIcon = false, type, ...props }: AddToCartProps) => {
    const { t } = useTranslation('common', i18n);
    const { t: tCart } = useTranslation('cart', i18n);
    const { queueEvent } = useTrackable();
    const path = usePathname();
    const { locale, currency } = useShop();

    const [animation, setAnimation] = useState<NodeJS.Timeout | undefined>();
    const { selectedVariant, product } = useProduct();
    const { status, linesAdd } = useCart();

    const ready = ['idle', 'uninitialized'].includes(status) || !selectedVariant;

    let label: ReactNode = t('add-to-cart');
    if (animation) {
        // 1. Have we just successfully added to cart, if so, show a checkmark.
        label = t('added-to-cart');
    } else if (selectedVariant && !selectedVariant.availableForSale) {
        // 2. If out of stock, show the relevant label.
        label = t('out-of-stock');
        // eslint-disable-next-line brace-style
    } /* else if (!ready) {
        // 3. Cart is not ready, tell the user.
        label = t('cart-not-ready');
    } */ else if (!quantity || quantity < 1) {
        // 4. Quantity is either invalid or 0.
        // TODO: This should not be a disabled state.
        label = t('quantity-too-low');
    }

    return (
        <Button
            {...props}
            className={`${styles['add-to-cart']} ${className || ''}`}
            data-ready={ready}
            disabled={!selectedVariant!.availableForSale || quantity < 1}
            as="button"
            type={type || ('button' as any)}
            data-success={(animation && 'true') || undefined}
            onClick={() => {
                if (!ready || !product || !selectedVariant) {
                    // TODO: i18n.
                    toast.warning(`The cart is still loading, please try again in a few seconds`);
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
                            currency: selectedVariant.price?.currencyCode || currency || 'USD',
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
                                    currency: selectedVariant.price?.currencyCode || currency || 'USD',
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
            }}
            title={tCart('add-n-to-your-cart', quantity)}
        >
            {label}
        </Button>
    );
};

export default memo(AddToCart, deepEqual);

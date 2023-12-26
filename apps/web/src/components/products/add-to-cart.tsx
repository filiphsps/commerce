'use client';

import type { Product, ProductVariant } from '@/api/product';
import { Button } from '@/components/actionable/button';
import styles from '@/components/products/add-to-cart.module.scss';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { ShopifyPriceToNumber } from '@/utils/pricing';
import { useTrackable } from '@/utils/trackable';
import { useCart, useProduct } from '@shopify/hydrogen-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useState, type HTMLProps } from 'react';
import { toast } from 'sonner';

export type AddToCartProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    quantity: number;

    data?: Product;
    variant?: ProductVariant;
} & Omit<HTMLProps<HTMLButtonElement>, 'data'>;

// eslint-disable-next-line unused-imports/no-unused-vars
const AddToCart = ({ locale, i18n, className, quantity = 0, type, data, variant, ...props }: AddToCartProps) => {
    const { t } = useTranslation('common', i18n);
    const { t: tCart } = useTranslation('cart', i18n);
    const { queueEvent } = useTrackable();
    const path = usePathname();

    const [animation, setAnimation] = useState<NodeJS.Timeout | undefined>();
    // This is a bit of a hack, but it works.
    const { selectedVariant, product } = data ? { selectedVariant: variant, product: data } : useProduct();
    const { status, linesAdd } = useCart();

    const ready = ['idle', 'uninitialized'].includes(status) || !selectedVariant;

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
    }, [selectedVariant, quantity]);

    let label: ReactNode = t('add-to-cart');
    if (animation) {
        // 1. Have we just successfully added to cart, if so, show a checkmark.
        label = t('added-to-cart');
    } else if (!selectedVariant?.availableForSale) {
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
            disabled={!ready || !selectedVariant!.availableForSale || quantity < 1}
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
export default AddToCart;

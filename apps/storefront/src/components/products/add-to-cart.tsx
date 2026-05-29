'use client';

import type { ProductSnapshot } from '@nordcom/cart-core';
import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { usePathname, useRouter } from 'next/navigation';
import { type ComponentPropsWithoutRef, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Product, ProductVariant } from '@/api/product';
import { Button } from '@/components/actionable/button';
import { useShop } from '@/components/shop/provider';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { useTrackable } from '@/utils/trackable';

export type AddToCartProps = {
    i18n: LocaleDictionary;
    redirect?: boolean;
    disabled?: boolean;
    quantity: number;
    data: {
        product?: Product;
        selectedVariant?: ProductVariant;
    };
} & Omit<ComponentPropsWithoutRef<'button'>, 'data'>;

/**
 * Add-to-cart button that fires a cart line mutation and emits a tracking event on success.
 *
 * @param props.i18n - Locale dictionary for button labels and toast messages.
 * @param props.redirect - When `true`, navigates to `/cart/` after a successful add.
 * @param props.disabled - Overrides the ready-state check to force a disabled state.
 * @param props.quantity - Number of units to add; values below 1 disable the button.
 * @param props.data - Object containing the product and selected variant to add.
 * @param props.children - Optional label override; defaults to the i18n add-to-cart string.
 * @returns The `Button` element wired to the cart add action.
 */
export function AddToCart({
    i18n,
    redirect = false,
    disabled: isDisabled = false,
    quantity = 0,
    data: { product, selectedVariant } = {},
    children,
    className,
    type,
    ...props
}: AddToCartProps) {
    const { locale } = useShop();

    const { t } = getTranslations('common', i18n);
    const { t: tCart } = getTranslations('cart', i18n);
    const path = usePathname();
    const router = useRouter();

    const { postEvent } = useTrackable();

    const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        return () => {
            if (animationTimerRef.current !== null) {
                clearTimeout(animationTimerRef.current);
                animationTimerRef.current = null;
            }
        };
    }, []);

    const { addLine } = useCartActions();
    const { cartReady, status } = useCartStatus();

    const ready = selectedVariant?.availableForSale && cartReady && status !== 'mutating';

    const add = useCallback(async () => {
        if (!ready || !product) {
            // TODO: i18n.
            toast.warning(`The cart is still loading, please try again in a few seconds!`);
            return;
        }

        const variantId = selectedVariant.id!;
        const variantImage = selectedVariant.image
            ? {
                  url: selectedVariant.image.url ?? '',
                  altText: selectedVariant.image.altText ?? null,
                  width: selectedVariant.image.width ?? 0,
                  height: selectedVariant.image.height ?? 0,
              }
            : null;
        const snapshot: ProductSnapshot = {
            variantId,
            productHandle: product.handle ?? '',
            productTitle: product.title ?? '',
            variantTitle: selectedVariant.title ?? '',
            image: variantImage,
            unitPrice: {
                amount: selectedVariant.price.amount ?? '0',
                currencyCode: selectedVariant.price.currencyCode ?? 'USD',
            },
            compareAtUnitPrice: selectedVariant.compareAtPrice
                ? {
                      amount: selectedVariant.compareAtPrice.amount ?? '0',
                      currencyCode: selectedVariant.compareAtPrice.currencyCode ?? 'USD',
                  }
                : null,
        };
        const result = await addLine({
            variantId,
            quantity,
            snapshot,
        });

        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        postEvent('add_to_cart', {
            path,
            gtm: {
                ecommerce: {
                    currency: selectedVariant.price.currencyCode!,
                    value: safeParseFloat(0, selectedVariant.price.amount) * quantity,
                    items: [
                        {
                            item_id: productToMerchantsCenterId({
                                locale,
                                product: {
                                    productGid: product.id!,
                                    variantGid: selectedVariant.id!,
                                },
                            }),
                            item_name: product.title,
                            item_variant: selectedVariant.title,
                            item_brand: product.vendor,
                            item_category: product.productType || undefined,
                            product_id: product.id,
                            variant_id: selectedVariant.id,
                            sku: selectedVariant.sku || undefined,
                            currency: selectedVariant.price.currencyCode!,
                            price: safeParseFloat(undefined, selectedVariant.price.amount!),
                            quantity,
                        },
                    ],
                },
            },
        });

        if (animationTimerRef.current !== null) clearTimeout(animationTimerRef.current);
        setAnimating(true);
        animationTimerRef.current = setTimeout(() => {
            setAnimating(false);
            animationTimerRef.current = null;
        }, 3000);

        if (redirect) {
            router.push('/cart/');
        }
    }, [addLine, selectedVariant, quantity, ready, locale, path, postEvent, product, redirect, router]);

    const label = (() => {
        if (children) return t('add-to-cart');

        if (animating) {
            // 1. Have we just successfully added to cart, if so, show a checkmark.
            return t('added-to-cart');
        } else if (!selectedVariant?.availableForSale) {
            // 2. If out of stock, show the relevant label.
            return t('out-of-stock');
        } else if (!quantity || quantity < 1) {
            // 3. Quantity is either invalid or 0.
            return t('quantity-too-low');
        }

        // 4. Default state.
        return t('add-to-cart');
    })();

    const disabled = isDisabled || !ready || quantity <= 0;

    return (
        <Button
            aria-disabled={disabled || undefined}
            {...props}
            className={cn(className)}
            disabled={disabled || undefined}
            as="button"
            type={(type as 'button' | 'reset' | 'submit' | undefined) || 'button'}
            data-ready={ready || undefined}
            data-success={animating ? 'true' : undefined}
            onClick={add}
            title={tCart('add-n-to-your-cart', quantity)}
            data-nosnippet={true}
        >
            {children || label}
        </Button>
    );
}
AddToCart.displayName = 'Nordcom.Products.AddToCart';

AddToCart.skeleton = Object.assign(
    function AddToCartSkeleton({}: {}) {
        return <Button aria-disabled={true} disabled={true} as="button" />;
    },
    { displayName: 'Nordcom.Products.AddToCart.Skeleton' },
);

export default AddToCart;

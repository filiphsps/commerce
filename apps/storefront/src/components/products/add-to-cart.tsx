'use client';

import { useCart } from '@shopify/hydrogen-react';
import { usePathname, useRouter } from 'next/navigation';
import { type HTMLProps, useCallback, useState } from 'react';
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
} & Omit<HTMLProps<HTMLButtonElement>, 'data'>;

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

    const [animation, setAnimation] = useState<NodeJS.Timeout | undefined>();
    // This is a bit of a hack, but it works.
    const { cartReady, linesAdd, status = 'fetching' } = useCart();

    const ready = selectedVariant?.availableForSale && cartReady && !['updating'].includes(status);

    const add = useCallback(() => {
        if (!ready || !product) {
            // TODO: i18n.
            toast.warning(`The cart is still loading, please try again in a few seconds!`);
            return;
        }

        linesAdd([
            {
                merchandiseId: selectedVariant.id!,
                quantity,
            },
        ]);

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

        clearTimeout(animation);

        setAnimation(
            setTimeout(() => {
                clearTimeout(animation);
                setAnimation(() => undefined);
            }, 3000),
        );

        if (redirect) {
            router.push('/cart/');
        }
    }, [linesAdd, selectedVariant, quantity, ready, animation, locale, path, postEvent, product, redirect, router]);

    const label = (() => {
        if (children) return t('add-to-cart');

        if (animation) {
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
            type={(type as any) || ('button' as const)}
            data-ready={ready || undefined}
            data-success={(animation as any) ? 'true' : undefined}
            onClick={add}
            title={tCart('add-n-to-your-cart', quantity)}
            data-nosnippet={true}
        >
            {children || label}
        </Button>
    );
}
AddToCart.displayName = 'Nordcom.Products.AddToCart';

AddToCart.skeleton = function AddToCartSkeleton({}: {}) {
    return <Button aria-disabled={true} disabled={true} as="button" />;
};
(AddToCart.skeleton as any).displayName = 'Nordcom.Products.AddToCart.Skeleton';

export default AddToCart;

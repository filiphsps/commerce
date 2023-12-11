'use client';

import type { Product, ProductVariant } from '@/api/product';
import { ProductActionsContainer } from '@/components/products/product-actions-container';
import { useShop } from '@/components/shop/provider';
import Pricing from '@/components/typography/pricing';
import type { LocaleDictionary } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { ShopifyPriceToNumber } from '@/utils/pricing';
import { useTrackable } from '@/utils/trackable';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as NProgress from 'nprogress';
import { useEffect } from 'react';
import styles from './page.module.scss';

const getVariant = (product: Product, searchParams: ReadonlyURLSearchParams): ProductVariant | undefined => {
    return product.variants.edges.length > 1
        ? (searchParams.get('variant') &&
              product?.variants?.edges?.find(
                  ({ node }) => node.id === `gid://shopify/ProductVariant/${searchParams.get('variant')}`
              )?.node) ||
              undefined
        : product.variants.edges[0]!.node!;
};

export type ProductContentProps = {
    product: Product;
    initialVariant: ProductVariant;
    i18n: LocaleDictionary;
};
export function ProductContent({ product, initialVariant, i18n }: ProductContentProps) {
    const { replace } = useRouter();
    const path = usePathname();
    const searchParams = useSearchParams();
    const variant = getVariant(product, searchParams) || initialVariant;

    const { queueEvent } = useTrackable();
    const { locale } = useShop();

    useEffect(() => {
        if (!variant) return;

        queueEvent('view_item', {
            path,
            gtm: {
                ecommerce: {
                    currency: variant?.price?.currencyCode! || 'USD',
                    value: ShopifyPriceToNumber(undefined, variant?.price?.amount!),
                    items: [
                        {
                            item_id: ProductToMerchantsCenterId({
                                locale,
                                product: {
                                    productGid: product.id,
                                    variantGid: variant.id
                                }
                            }),
                            item_name: product?.title,
                            item_variant: variant?.title,
                            item_brand: product?.vendor,
                            currency: variant?.price?.currencyCode! || 'USD',
                            price: ShopifyPriceToNumber(undefined, variant?.price?.amount!),
                            quantity: 1
                        }
                    ]
                }
            }
        });
    }, [, variant]);

    useEffect(() => {
        setTimeout(() => {
            // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
            NProgress.done();
        }, 500);

        if (!searchParams.get('variant')) return;
        else if (!searchParams.get('variant')!.match(/^(?![0-9]+$).*/)) return;

        const variantId = searchParams.get('variant')!.split('/').at(-1);
        replace(`/products/${product.handle}/?variant=${variantId}`);
    }, [searchParams]);

    return (
        <>
            <ProductActionsContainer
                i18n={i18n}
                className={styles.actions}
                product={product as any}
                initialVariant={initialVariant!}
                selectedVariant={variant}
            />
        </>
    );
}

export function ProductPricing({ product, initialVariant }: Omit<ProductContentProps, 'i18n'>) {
    const searchParams = useSearchParams();
    const variant = getVariant(product, searchParams) || initialVariant;

    return <Pricing className={styles.pricing} price={variant.price} compareAtPrice={variant.compareAtPrice as any} />;
}

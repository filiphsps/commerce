'use client';

import styles from './page.module.scss';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import type { Shop } from '@nordcom/commerce-database';

import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { ShopifyPriceToNumber } from '@/utils/pricing';
import { useTrackable } from '@/utils/trackable';
import * as NProgress from 'nprogress';

import { ProductActionsContainer } from '@/components/products/product-actions-container';
import { useShop } from '@/components/shop/provider';
import Pricing from '@/components/typography/pricing';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

const getVariant = (product: Product, searchParams: ReadonlyURLSearchParams): ProductVariant | undefined => {
    return product.variants.edges.length > 1
        ? (searchParams.get('variant') &&
              product.variants.edges.find(
                  ({ node }) => node.id === `gid://shopify/ProductVariant/${searchParams.get('variant')}`
              )?.node) ||
              undefined
        : product.variants.edges[0]!.node!;
};

export type ProductContentProps = {
    shop: Shop;
    product: Product;
    initialVariant: ProductVariant;
    i18n: LocaleDictionary;

    children?: ReactNode;
};
export function ProductContent({ shop, product, initialVariant, i18n, children }: ProductContentProps) {
    const path = usePathname();
    const searchParams = useSearchParams();
    const variant = getVariant(product, searchParams) || initialVariant;

    const { queueEvent } = useTrackable();
    const { locale, currency } = useShop();

    useEffect(() => {
        if (!variant) return;

        queueEvent('view_item', {
            path,
            gtm: {
                ecommerce: {
                    currency: variant.price.currencyCode! || currency || 'USD',
                    value: ShopifyPriceToNumber(undefined, variant.price.amount!),
                    items: [
                        {
                            item_id: ProductToMerchantsCenterId({
                                locale,
                                product: {
                                    productGid: product.id,
                                    variantGid: variant.id
                                }
                            }),
                            item_name: product.title,
                            item_variant: variant.title,
                            item_brand: product.vendor,
                            item_category: product.productType,
                            product_id: product.id,
                            variant_id: variant.id,
                            sku: variant.sku || undefined,
                            currency: variant.price.currencyCode! || currency || 'USD',
                            price: ShopifyPriceToNumber(undefined, variant.price.amount!),
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
    }, [, searchParams]);

    return (
        <ProductActionsContainer
            shop={shop}
            i18n={i18n}
            className={styles.actions}
            product={product as any}
            initialVariant={initialVariant!}
            selectedVariant={variant}
        >
            {children || null}
        </ProductActionsContainer>
    );
}

export function ProductPricing({ product, initialVariant }: Omit<ProductContentProps, 'i18n'>) {
    const searchParams = useSearchParams();
    const variant = getVariant(product, searchParams) || initialVariant;

    return <Pricing price={variant.price} compareAtPrice={variant.compareAtPrice as any} />;
}

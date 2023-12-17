'use client';

import styles from '@/components/ProductCard/product-card.module.scss';
import ProductCardImage from '@/components/ProductCard/product-image';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import type { StoreModel } from '@/models/StoreModel';
import { deepEqual } from '@/utils/deep-equal';
import { ConvertToLocalMeasurementSystem, type LocaleDictionary } from '@/utils/locale';
import { useProduct } from '@shopify/hydrogen-react';
import type { ProductVariant, Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import type { CSSProperties, FunctionComponent } from 'react';
import { memo } from 'react';
import ProductCardActions from './product-card-actions';
import ProductTitle from './product-title';

export const AppendShopifyParameters = ({ params, url }: { params?: string | null; url: string }): string => {
    if (!params) return url;

    return `${url}${(url.includes('?') && '&') || '?'}${params}`;
};

interface ProductCardProps {
    store: StoreModel;
    className?: string;
    i18n: LocaleDictionary;
    style?: CSSProperties;
    priority?: boolean;
}
const ProductCard: FunctionComponent<ProductCardProps> = ({ className, i18n, style, priority }) => {
    const { product, selectedVariant, setSelectedVariant } = useProduct();

    const { locale } = useShop();

    if (!product || !product?.variants || !selectedVariant) {
        return <ProductCardSkeleton />;
    }

    const isNewProduct =
        product?.createdAt &&
        Math.abs(new Date(product?.createdAt).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000) < 15; // TODO: Do this properly through a tag or similar.
    const isVegan = product?.tags?.includes('Vegan');
    const isSale = !!selectedVariant?.compareAtPrice?.amount;

    let discount = 0;
    if (isSale && selectedVariant) {
        const compare = Number.parseFloat(selectedVariant.compareAtPrice!.amount!);
        const current = Number.parseFloat(selectedVariant.price!.amount!);
        discount = Math.round((100 * (compare - current)) / compare);
    }

    const linkTitle = `${product.vendor} ${product.title}`;

    // TODO: Hotlink to variant.
    const href = AppendShopifyParameters({
        url: `/products/${product.handle}/`,
        params: (product as any).trackingParameters
    });

    let image: ShopifyImage | undefined = ((selectedVariant?.image &&
        product.images?.edges?.find((i) => i?.node?.id === selectedVariant?.image!.id)?.node) ||
        product.images?.edges?.[0]?.node) as ShopifyImage | undefined;
    if (image) image.altText = image.altText || linkTitle;

    if (!selectedVariant) {
        console.warn('No variant selected for product card.');
        return null;
    }

    return (
        <div
            className={`${styles.container} ${className || ''}`}
            data-available={!!selectedVariant.availableForSale}
            style={style}
        >
            <div className={styles['image-container']}>
                {image ? (
                    <Link title={linkTitle} href={href}>
                        <ProductCardImage image={image} priority={priority} />
                    </Link>
                ) : null}

                {discount > 1 && ( // Handle rounding-errors.
                    <div className={styles.badge} data-variant="discount">
                        <b>{discount}%</b> OFF
                    </div>
                )}

                {isNewProduct || isVegan ? (
                    <div className={styles.badges}>
                        {isNewProduct && (
                            <div className={styles.badge} data-variant="new">
                                New!
                            </div>
                        )}
                        {isVegan && (
                            <div className={styles.badge} data-variant="vegan">
                                Vegan
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
            <div className={styles.details}>
                <Link href={href} title={linkTitle} className={styles.header}>
                    <ProductTitle />
                </Link>

                {/* FIXME: Deal with options here. */}
                {(product?.variants?.edges?.length || 0) > 1 ? (
                    <section className={styles.variants}>
                        {product?.variants?.edges &&
                            product?.variants.edges.length > 1 &&
                            product?.variants.edges.map((edge, index) => {
                                if (!edge?.node || index >= 3) return null; //TODO: handle more than 3 variants on the card.
                                const variant = edge.node! as ProductVariant;
                                let title = variant.title;

                                if (
                                    variant.selectedOptions.length === 1 &&
                                    variant.selectedOptions[0]!.name === 'Size' &&
                                    variant.weight &&
                                    variant.weightUnit
                                ) {
                                    title = ConvertToLocalMeasurementSystem({
                                        locale: locale,
                                        weight: variant.weight,
                                        weightUnit: variant.weightUnit
                                    });
                                }

                                return (
                                    <button
                                        key={variant.id}
                                        title={variant.selectedOptions.map((i) => `${i.name}: ${i.value}`).join(', ')}
                                        onClick={() => setSelectedVariant(variant)}
                                        className={styles.variant}
                                        data-active={selectedVariant.id === variant.id}
                                    >
                                        {title}
                                    </button>
                                );
                            })}
                    </section>
                ) : null}
            </div>

            <ProductCardActions i18n={i18n} />
        </div>
    );
};

export const ProductCardSkeleton = () => {
    return (
        <div className={`${styles.container} ${styles.skeleton}`}>
            <div className={styles.image}></div>
            <div></div>
            <div></div>
        </div>
    );
};

export default memo(ProductCard, deepEqual);

'use client';

import styles from '@/components/ProductCard/product-card.module.scss';
import ProductCardImage from '@/components/ProductCard/product-image';
import Link from '@/components/link';
import AddToCart from '@/components/products/add-to-cart';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { useShop } from '@/components/shop/provider';
import Pricing from '@/components/typography/pricing';
import type { StoreModel } from '@/models/StoreModel';
import { deepEqual } from '@/utils/deep-equal';
import { ConvertToLocalMeasurementSystem, type LocaleDictionary } from '@/utils/locale';
import { useProduct } from '@shopify/hydrogen-react';
import type { ProductVariant, Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import type { CSSProperties, FunctionComponent } from 'react';
import { memo, useState } from 'react';
import styled from 'styled-components';
import ProductTitle from './product-title';

const Actions = styled.div`
    grid-area: product-actions;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr minmax(4rem, 1fr);
    grid-auto-flow: dense;
    gap: var(--block-spacer);
    justify-content: space-between;
    align-items: end;
`;

const DiscountBadge = styled.div`
    position: absolute;
    inset: var(--block-spacer-tiny) var(--block-spacer-tiny) auto auto;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--block-padding-small) var(--block-padding);
    z-index: 1;
    pointer-events: none;
    font-weight: 500;
    font-size: 1.15rem;
    line-height: 1;
    background: var(--color-sale);
    color: var(--color-bright);
    border-radius: var(--block-border-radius);
    box-shadow: 0 0 0.5rem 0 var(--color-block-shadow);

    b {
        font-weight: 700;
        font-size: 1.45rem;
        margin-right: var(--block-spacer-tiny);
    }
`;
const Badges = styled.div`
    display: flex;
    align-items: start;
    justify-content: start;
    gap: var(--block-spacer-small);
    z-index: 1;
    pointer-events: none;

    position: absolute;
    inset: auto 0 0 auto;
`;
const Badge = styled.div`
    flex-shrink: 1;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer-small);
    padding: var(--block-padding-small) var(--block-padding) calc(var(--block-padding-small) * 1.25)
        var(--block-padding);
    background: var(--accent-primary-light);
    color: var(--accent-primary-text);
    border-top-left-radius: var(--block-border-radius);
    font-weight: 500;
    font-size: 1.25rem;
    line-height: normal;
    text-align: center;

    &.New {
        background: var(--accent-primary-light);
        color: var(--accent-primary-text);
    }
    &.Vegan {
        background: rgba(var(--color-green-rgb), 0.9);
        color: var(--color-bright);
        text-shadow: 0 0 0.25rem var(--color-dark);
    }
`;

const Container = styled.section<{ $available?: boolean }>`
    background: var(--accent-secondary-light);
    color: var(--accent-secondary-text);

    &[data-available='false'] {
        opacity: 0.75;
        filter: brightness(0.85);
        background: var(--color-block);
        color: var(--color-dark);
    }
`;

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
    const [quantityValue, setQuantityValue] = useState(1);
    const quantity = quantityValue || 0;
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
        <Container
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
                    <DiscountBadge>
                        <b>{discount}%</b> OFF
                    </DiscountBadge>
                )}

                {isNewProduct || isVegan ? (
                    <Badges>
                        {isNewProduct && <Badge className="New">New!</Badge>}
                        {isVegan && <Badge className="Vegan">Vegan</Badge>}
                    </Badges>
                ) : null}
            </div>
            <div className={styles.details}>
                <Link href={href} title={linkTitle} className={styles.header}>
                    <ProductTitle title={product.title} vendor={product.vendor} />
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
            <Actions>
                <div className={styles['quantity-action']}>
                    <Pricing
                        className={styles.pricing}
                        price={selectedVariant.price as any}
                        compareAtPrice={selectedVariant?.compareAtPrice as any}
                    />

                    <QuantitySelector
                        className={styles.quantity}
                        i18n={i18n}
                        value={quantityValue}
                        update={(quantity) => {
                            setQuantityValue(quantity);
                        }}
                    />
                </div>

                <AddToCart
                    className={styles.button}
                    type="button"
                    quantity={quantity}
                    i18n={i18n}
                    disabled={!!selectedVariant.availableForSale}
                />
            </Actions>
        </Container>
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

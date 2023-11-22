'use client';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useProduct } from '@shopify/hydrogen-react';
import type { ProductVariant, Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import { useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

import { ConvertToLocalMeasurementSystem } from '@/api/shopify/product';
import styles from '@/components/ProductCard/product-card.module.scss';
import Link from '@/components/link';
import { AddToCart } from '@/components/products/add-to-cart';
import { QuantityInputFilter } from '@/components/products/quantity-selector';
import Pricing from '@/components/typography/pricing';
import type { StoreModel } from '@/models/StoreModel';
import Image from 'next/image';
import type { CSSProperties, FunctionComponent } from 'react';

const ProductImageWrapper = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;

    img {
        position: relative;
        object-fit: contain;
        object-position: center;
        width: 100%;
        height: 100%;
    }
`;

const Variants = styled.div`
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    gap: var(--block-spacer);
    width: 100%;
    height: 100%;
    font-size: 1.75rem;
`;

const Variant = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    font-weight: 500;
    font-size: 1em;
    line-height: 1;
    text-align: right;
    cursor: pointer;
    opacity: 0.75;
    transition: 150ms ease-in-out all;

    &.active {
        opacity: 1;
        color: var(--accent-primary);
        text-decoration: underline;
        text-decoration-thickness: 0.2rem;
    }

    &:is(.active, :hover, :active, :focus) {
        opacity: 1;
    }
`;

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

const Quantity = styled.div`
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    justify-self: end;
    height: 3.25rem;
    font-size: 1.25rem;
    line-height: 1.75rem;
    font-weight: 500;
    text-align: center;
    user-select: none;
    background-color: var(--color-bright);
    border-radius: var(--block-border-radius);
`;
const QuantityAction = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 100%;
    padding: 0 0.5rem 0.25rem 0;
    cursor: pointer;
    transition: 150ms ease-in-out all;
    text-align: center;
    font-size: 2rem;

    &:first-child {
        justify-content: center;
        padding-right: 0;
        padding-left: 0.5rem;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--accent-secondary);
            color: var(--accent-secondary-text);
        }
    }

    &:is(:active) {
        color: var(--accent-primary-dark);
        background: var(--accent-primary-text);
        border-color: var(--accent-primary);
    }

    &.Inactive {
        width: 0.5rem;
        color: transparent;
        pointer-events: none;
    }
`;
const QuantityValue = styled.input`
    appearance: none;
    display: block;
    width: 2.2rem; // 1 char = 1.2rem. Then 1rem padding
    min-width: 1.25rem;
    height: 100%;
    padding: 0 0 0.25rem 0;
    font-size: 1.85rem;
    text-align: center;
    outline: none;
    transition: 150ms all ease-in-out;
    font-variant: common-ligatures tabular-nums slashed-zero;

    @media (min-width: 950px) {
        padding-bottom: 0.15rem;
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button,
    &[type='number'] {
        -webkit-appearance: none;
        margin: 0;
    }
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

    ${({ $available }) =>
        !$available &&
        css`
            opacity: 0.75;
            filter: brightness(0.85);
            background: var(--color-block);
            color: var(--color-dark);
        `}
`;

export const AppendShopifyParameters = ({ params, url }: { params?: string | null; url: string }): string => {
    if (!params) return url;

    return `${url}${(url.includes('?') && '&') || '?'}${params}`;
};

interface ProductCardProps {
    store: StoreModel;
    locale: Locale;
    className?: string;
    i18n: LocaleDictionary;
    style?: CSSProperties;
}
const ProductCard: FunctionComponent<ProductCardProps> = ({ className, locale, i18n, style }) => {
    const [quantityValue, setQuantityValue] = useState('1');
    const quantity = quantityValue ? Number.parseInt(quantityValue) : 0;
    const { product, selectedVariant, setSelectedVariant } = useProduct();
    const quantityRef = useRef<HTMLInputElement>();

    useEffect(() => {
        if (Number.parseInt(quantityValue) < 0) {
            setQuantityValue('1');
            return;
        } else if (Number.parseInt(quantityValue) > 999) {
            setQuantityValue('999');
            return;
        }

        if (!quantityRef.current) return; // TODO: Handle this properly.
        const length = quantityValue.split('').length;
        if (length <= 1) quantityRef.current.style.removeProperty('width');
        else quantityRef.current.style.width = `${length * 1.15 + 0.75}rem`;
    }, [quantityValue]);

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
            $available={selectedVariant.availableForSale}
            style={style}
        >
            <div className={styles.image}>
                {image ? (
                    <Link title={linkTitle} href={href}>
                        <ProductImageWrapper>
                            <Image
                                key={image.id}
                                id={image.id!}
                                src={image.url}
                                alt={image?.altText!}
                                title={image?.altText!}
                                width={195}
                                height={155}
                                sizes="(max-width: 950px) 155px, 200px"
                            />
                        </ProductImageWrapper>
                    </Link>
                ) : (
                    <div /> // Dummy.
                )}

                {discount > 1 && ( // Handle rounding-errors.
                    <DiscountBadge>
                        <b>{discount}%</b> OFF
                    </DiscountBadge>
                )}

                <Badges>
                    {isNewProduct && <Badge className="New">New!</Badge>}
                    {isVegan && <Badge className="Vegan">Vegan</Badge>}
                </Badges>
            </div>
            <div className={styles.details}>
                <div title={linkTitle} className={styles.header}>
                    <Link href={href}>
                        <div className={styles.brand}>{product.vendor}</div>
                        <div className={styles.title}>{product.title}</div>
                    </Link>
                </div>

                {/* FIXME: Deal with options here. */}
                <Variants>
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
                                <Variant
                                    key={variant.id}
                                    title={variant.selectedOptions.map((i) => `${i.name}: ${i.value}`).join(', ')}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={selectedVariant.id === variant.id ? 'active' : ''}
                                >
                                    {title}
                                </Variant>
                            );
                        })}
                </Variants>
            </div>
            <Actions>
                <div className={styles['quantity-action']}>
                    <Pricing
                        className={styles.pricing}
                        price={selectedVariant.price as any}
                        compareAtPrice={selectedVariant?.compareAtPrice as any}
                    />

                    <Quantity>
                        <QuantityAction
                            className={quantity > 1 ? '' : 'Inactive'}
                            onClick={() => quantity > 0 && setQuantityValue(`${quantity - 1}`)}
                        >
                            -
                        </QuantityAction>
                        <QuantityValue
                            ref={quantityRef as any}
                            type="number"
                            min={1}
                            max={999}
                            step={1}
                            pattern="[0-9]"
                            value={quantityValue}
                            placeholder="Quantity"
                            name="quantity"
                            onBlur={(_) => {
                                if (!quantityValue) setQuantityValue('1');
                            }}
                            onChange={(e) => {
                                setQuantityValue(QuantityInputFilter(e?.target?.value, quantityValue));
                            }}
                        />
                        <QuantityAction onClick={() => setQuantityValue(`${quantity + 1}`)}>+</QuantityAction>
                    </Quantity>
                </div>

                <AddToCart className={styles.button} type="button" quantity={quantity} locale={locale} i18n={i18n} />
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

export default ProductCard;

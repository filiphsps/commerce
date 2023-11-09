'use client';

import addToCartStyles from '@/components/products/add-to-cart.module.scss';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Money, useCart, useProduct } from '@shopify/hydrogen-react';
import type { ProductVariant, Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import { useEffect, useRef, useState } from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import styled, { css } from 'styled-components';

import { ConvertToLocalMeasurementSystem } from '@/api/shopify/product';
import Link from '@/components/link';
import { QuantityInputFilter } from '@/components/products/quantity-selector';
import type { StoreModel } from '@/models/StoreModel';
import { useTranslation } from '@/utils/locale';
import { TitleToHandle } from '@/utils/title-to-handle';
import Image from 'next/image';
import type { FunctionComponent } from 'react';

export const ProductImage = styled.div`
    grid-area: product-image;
    overflow: hidden;
    position: relative;
    height: auto;
    width: 100%;
    padding: var(--block-padding-small) var(--block-padding);
    border-radius: var(--block-border-radius-small);
    transition: 150ms ease-in-out;
    user-select: none;
    background: var(--color-bright);
    height: 13rem;
    box-shadow: 0 0 1rem -0.5rem var(--color-block-shadow);

    @media (min-width: 950px) {
        height: 16rem;
        padding: var(--block-padding) var(--block-padding-large);
        margin-bottom: var(--block-spacer-tiny);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            padding: var(--block-padding-small);
        }
    }
`;

const ProductImageWrapper = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;

    img {
        object-fit: contain;
        object-position: center;
        width: 100% !important;
        position: relative !important;
        height: 100% !important;
    }
`;

const Details = styled.div`
    grid-area: product-details;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    justify-self: stretch;
    min-height: 10rem;
`;
const Brand = styled.div`
    font-size: 1.75rem;
    line-height: normal;
    font-weight: 500;

    @media (min-width: 950px) {
        font-size: 1.5rem;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover,
        &:active,
        &:focus {
            text-decoration: underline;
            text-decoration-style: dotted;
            text-decoration-thickness: 0.2rem;
            text-underline-offset: var(--block-border-width);
        }
    }
`;
const Title = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    font-size: 2.25rem;
    line-height: 1;
    font-weight: 700;
    hyphens: auto;
    -webkit-hyphens: auto;

    @media (min-width: 950px) {
        font-size: 2rem;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover,
        &:active,
        &:focus {
            text-decoration: underline;
            text-decoration-style: dotted;
            text-decoration-thickness: 0.2rem;
            text-underline-offset: var(--block-border-width);
        }
    }
`;

const CardFooter = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    justify-content: flex-end;
    align-items: flex-end;
    gap: var(--block-spacer);
    width: 100%;
    max-height: 100%;
    margin-top: var(--block-spacer-tiny);
`;

/*gap: var(--block-spacer-tiny);*/
const Variants = styled.div`
    display: flex;
    align-items: end;
    justify-content: start;
    width: 100%;
    height: 100%;

    @media (min-width: 920px) {
        gap: var(--block-spacer-tiny);
    }
`;

/* width: 5rem;
height: 3rem;
padding: var(--block-spacer-tiny) 0 0 0;
font-size: 1.5rem; */
const Variant = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
    padding: var(--block-spacer-tiny) var(--block-spacer-tiny) 0 var(--block-spacer-tiny);
    font-weight: 600;
    font-size: 1.75rem;
    line-height: normal;
    text-align: right;
    cursor: pointer;
    opacity: 0.85;
    transition: 150ms ease-in-out all;

    &.active {
        opacity: 1;
        color: var(--accent-primary);

        @media (min-width: 920px) {
            text-decoration: underline;
        }
    }

    &.active,
    &:hover,
    &:active,
    &:focus {
        opacity: 1;
    }

    @media (min-width: 920px) {
        padding: 0;
        font-size: 1.5rem;
    }
`;

const Actions = styled.div`
    grid-area: product-actions;
    display: grid;
    grid-template-columns: minmax(auto, auto) auto;
    justify-content: space-between;
    align-items: end;
    gap: var(--block-spacer-small);
`;
const AddButton = styled.button`
    min-height: 3.5rem;
    border: none;
    padding: calc(var(--block-padding-small) / 2) var(--block-padding-large);
    font-size: 1.5rem;

    @media (min-width: 920px) {
        min-height: 3rem;
        padding: calc(var(--block-padding-small) / 2) var(--block-padding);
        font-size: 1.25rem;
    }
`;
const Quantity = styled.div`
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    justify-self: end;
    height: 100%;
    font-size: 1.5rem;
    line-height: 1.75rem;
    font-weight: 500;
    text-align: center;
    user-select: none;

    background: var(--color-bright);
    border-radius: var(--block-border-radius-small);
    padding: 0;

    svg {
        font-weight: 700;
        stroke-width: 0.4ex;
    }
`;
const QuantityAction = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 100%;
    border-radius: 0 0 0 var(--block-border-radius) 0;
    border-radius: var(--block-border-radius-small);
    cursor: pointer;
    transition: 150ms ease-in-out;
    text-align: center;

    &:first-child {
        justify-content: center;
        border-radius: 0 0 var(--block-border-radius) 0 0;
        border-radius: var(--block-border-radius-small);
    }

    &.Inactive {
        width: 0.5rem;
        color: transparent;
        pointer-events: none;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--accent-secondary);
            color: var(--accent-secondary-text);
        }
    }

    &:active {
        color: var(--accent-primary-dark);
        background: var(--accent-primary-text);
        border-color: var(--accent-primary);
    }
`;
const QuantityValue = styled.input`
    appearance: none;
    display: block;
    width: 2.2rem; // 1 char = 1.2rem. Then 1rem padding
    min-width: 1.25rem;
    height: 100%;
    font-size: 1.75rem;
    line-height: 1;
    text-align: center;
    outline: none;
    transition: 150ms all ease-in-out;
    font-variant: common-ligatures tabular-nums slashed-zero;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button,
    &[type='number'] {
        -webkit-appearance: none;
        margin: 0;
    }
`;

const Prices = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    width: 100%;
`;
const Price = styled.div`
    font-size: 1.95rem;
    line-height: 1;
    font-weight: 600;

    &.Sale {
        font-size: 2.2rem;
        font-weight: 900;
        color: var(--color-sale);
    }
`;
const PreviousPrice = styled.div`
    font-size: 1.5rem;
    line-height: 1.5rem;
    font-weight: 500;
    text-decoration: line-through;
    opacity: 0.75;
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
    position: relative;
    flex: 1 auto;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr auto;
    grid-template-areas: 'product-image' 'product-details' 'product-actions';
    gap: var(--block-spacer);
    min-width: var(--component-product-card-width);
    min-height: 36rem;
    padding: calc(var(--block-padding) - var(--block-border-width));
    scroll-snap-align: start;
    border-radius: var(--block-border-radius);
    background: var(--accent-secondary-light);
    color: var(--accent-secondary-text);

    @media (min-width: 950px) {
        gap: var(--block-spacer-small);
        min-height: 38rem;
    }

    ${({ $available }) =>
        !$available &&
        css`
            opacity: 0.75;
            filter: brightness(0.85);
            background: var(--color-block);
            color: var(--color-dark);
        `}
`;

interface VariantImageProps {
    image?: ShopifyImage;
}
const VariantImage: FunctionComponent<VariantImageProps> = ({ image }) => {
    if (!image) return null;

    return (
        <Image src={image.url} alt={image.altText || ''} title={image.altText || undefined} height={200} width={200} />
    );
};

export const AppendShopifyParameters = ({ params, url }: { params?: string | null; url: string }): string => {
    if (!params) return url;

    return `${url}${(url.includes('?') && '&') || '?'}${params}`;
};

interface ProductCardProps {
    store: StoreModel;
    locale: Locale;
    handle?: string;
    className?: string;
    i18n: LocaleDictionary;
}
const ProductCard: FunctionComponent<ProductCardProps> = ({ className, locale, i18n }) => {
    const { t } = useTranslation('common', i18n);
    const [quantityValue, setQuantityValue] = useState('1');
    const quantity = quantityValue ? Number.parseInt(quantityValue) : 0;
    const [addedToCart, setAddedToCart] = useState(false);
    const cart = useCart();
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

    // TODO: Placeholder animation.
    if (!product || !selectedVariant) return <Container className={`${className || ''} Loading`} />;

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

    let shortDesc = (product.seo?.description || product.description || '').substring(0, 100);
    // Remove whitespace if it's the last character
    if (shortDesc[shortDesc.length - 1] === ' ') shortDesc = shortDesc.substring(0, shortDesc.length - 1);

    const image = product?.images?.edges?.find((edge) => edge?.node?.id === selectedVariant?.image?.id)
        ?.node as ShopifyImage;

    const description =
        (product.seo?.description || product.description) &&
        (product.seo?.description || product.description)?.substring(0, 72) + '\u2026';

    // TODO: Hotlink to variant.
    const href = AppendShopifyParameters({
        url: `/products/${product.handle}/`,
        params: (product as any).trackingParameters
    });

    const linkTitle = `${product.vendor} ${product.title}`;
    return (
        <Container className={className} $available={selectedVariant.availableForSale}>
            <ProductImage>
                <Link title={linkTitle} href={href} prefetch={false}>
                    <ProductImageWrapper>
                        <VariantImage image={image} />
                    </ProductImageWrapper>
                </Link>

                {discount > 1 && ( // Handle rounding-errors
                    <DiscountBadge>
                        <b>{discount}%</b> OFF
                    </DiscountBadge>
                )}

                <Badges>
                    {isNewProduct && <Badge className="New">New!</Badge>}
                    {isVegan && <Badge className="Vegan">Vegan</Badge>}
                </Badges>
            </ProductImage>
            <Details className="Details">
                {product.vendor && (
                    <Brand>
                        <Link href={`/collections/${TitleToHandle(product.vendor)}/`} prefetch={false}>
                            {product.vendor}
                        </Link>
                    </Brand>
                )}
                <Title title={linkTitle}>
                    <Link href={href} prefetch={false}>
                        {product.title}
                    </Link>
                </Title>

                <CardFooter>
                    <Prices>
                        {selectedVariant?.compareAtPrice && (
                            <Money
                                data={{
                                    currencyCode: selectedVariant.price?.currencyCode!,
                                    ...selectedVariant.compareAtPrice
                                }}
                                as={PreviousPrice}
                            />
                        )}
                        {(selectedVariant?.price?.amount && (
                            <Money
                                data={selectedVariant.price}
                                as={Price}
                                className={(selectedVariant?.compareAtPrice && 'Sale') || ''}
                            />
                        )) ||
                            null}
                    </Prices>

                    {/* FIXME: Deal with options here */}
                    <Variants>
                        {product.variants?.edges &&
                            product.variants.edges.length > 1 &&
                            product.variants.edges.map((edge) => {
                                if (!edge?.node) return null;
                                const variant = edge.node! as ProductVariant;
                                let title = variant.title;

                                // Handle variants that should have their weight as their actual title
                                // FIXME: Remove `Size` when we've migrated to using Weight.
                                // FIXME: Remove incorrectly translated ones, eg  "Größe" & "Storlek".
                                if (
                                    variant.selectedOptions.length === 1 &&
                                    ['Size', 'Weight', 'Größe', 'Storlek'].includes(
                                        variant.selectedOptions.at(0)!.name
                                    ) &&
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
                </CardFooter>
            </Details>
            <Actions>
                <AddButton
                    type="button"
                    title={t('add-to-cart')}
                    className={`${addToCartStyles.button} ${addToCartStyles.addToCart} ${
                        (addedToCart && addToCartStyles.success) || ''
                    }`}
                    onClick={() => {
                        if ((cart.status !== 'idle' && cart.status !== 'uninitialized') || !product || !selectedVariant)
                            return;

                        setAddedToCart(true);
                        cart.linesAdd([
                            {
                                merchandiseId: selectedVariant.id as string,
                                quantity
                            }
                        ]);

                        setTimeout(() => {
                            setAddedToCart(false);
                        }, 3000);
                    }}
                    disabled={
                        !['uninitialized', 'idle'].includes(cart.status) ||
                        quantity < 1 ||
                        !selectedVariant?.availableForSale
                    }
                >
                    {(!selectedVariant.availableForSale && t('out-of-stock')) ||
                        (addedToCart && t('added-to-cart')) ||
                        t('add-to-cart')}
                </AddButton>
                <Quantity>
                    <QuantityAction
                        className={quantity > 1 ? '' : 'Inactive'}
                        onClick={() => quantity > 0 && setQuantityValue(`${quantity - 1}`)}
                    >
                        <FiMinus />
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
                    <QuantityAction onClick={() => setQuantityValue(`${quantity + 1}`)}>
                        <FiPlus />
                    </QuantityAction>
                </Quantity>
            </Actions>
        </Container>
    );
};

export default ProductCard;

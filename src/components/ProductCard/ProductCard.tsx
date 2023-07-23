import { ConvertToLocalMeasurementSystem, PRODUCT_ACCENT_CACHE_TIMEOUT } from '../../api/product';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { FunctionComponent, useEffect, useState } from 'react';
import {
    ProductVariantEdge,
    Image as ShopifyImage
} from '@shopify/hydrogen-react/storefront-api-types';
import styled, { css } from 'styled-components';
import { useCart, useProduct } from '@shopify/hydrogen-react';

import { Button } from '../Button';
import { Config } from '../../util/Config';
import Currency from '../Currency';
import Image from 'next/image';
import { ImageLoader } from '../../util/ImageLoader';
import Link from 'next/link';
import { StoreModel } from '../../models/StoreModel';
import TinyCache from 'tinycache';
import TitleToHandle from '../../util/TitleToHandle';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

const Container = styled.section<{ available?: boolean }>`
    position: relative;
    flex: 1 auto;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: var(--block-spacer);
    min-width: var(--component-product-card-width);
    padding: var(--block-padding);
    scroll-snap-align: start;
    border-radius: var(--block-border-radius);
    background: var(--primary);
    color: var(--primary-foreground);
    background: radial-gradient(circle, var(--primary) 0%, var(--primary-dark) 200%);

    ${({ available }) =>
        !available &&
        css`
            opacity: 0.75;
            filter: brightness(0.85);
            background: var(--color-block);
            color: var(--color-dark);
        `}
`;
export const ProductImage = styled.div<{ isHorizontal?: boolean }>`
    overflow: hidden;
    position: relative;
    height: auto;
    width: 100%;
    padding: var(--block-padding-large);
    border-radius: calc(var(--block-border-radius) * 0.75);
    transition: 250ms ease-in-out;
    user-select: none;
    background: var(--color-bright);
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);

    ${({ isHorizontal }) =>
        (isHorizontal &&
            css`
                height: 14rem;
            `) ||
        css`
            @media (min-width: 950px) {
                height: 14rem;
                display: grid;
                justify-content: center;
                align-items: center;
                grid-template-columns: 1fr;
            }
        `}

    &:hover {
        padding: var(--block-padding-small);
    }
`;
const ProductImageWrapper = styled.div`
    position: relative;
    height: 100%;
    width: 100%;

    span {
        max-height: 100%;
    }

    img {
        object-fit: contain;
        object-position: center;
        width: 100% !important;
        position: relative !important;
        height: 100% !important;
    }
`;

const Details = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    justify-self: stretch;
    min-height: 10rem;
    gap: calc(var(--block-spacer-small) / 4);

    @media (min-width: 950px) {
        gap: calc(var(--block-spacer-small) / 2);
    }
`;
const Brand = styled.div`
    font-size: 1.5rem;
    line-height: 1.5rem;
    font-weight: 500;

    @media (min-width: 950px) {
        font-size: 1.5rem;
        line-height: 1.5rem;
    }

    &:hover,
    &:active,
    &:focus {
        text-decoration: underline;
        text-decoration-style: dotted;
        text-decoration-thickness: 0.2rem;
        text-underline-offset: var(--block-border-width);
    }
`;
const Title = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 700;

    @media (min-width: 950px) {
        font-size: 2rem;
        line-height: 2.25rem;
    }

    &:hover,
    &:active,
    &:focus {
        text-decoration: underline;
        text-decoration-style: dotted;
        text-decoration-thickness: 0.2rem;
        text-underline-offset: var(--block-border-width);
    }
`;
const Description = styled.div`
    display: none;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    margin-top: var(--block-spacer);
    font-size: 1.25rem;
    line-height: 1.5rem;
    font-weight: 500;
`;

const VariantsContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    justify-content: center;
    align-items: flex-end;
    justify-self: end;
    gap: var(--block-spacer);
    width: 100%;
    height: 100%;
    margin-top: var(--block-spacer-large);
    transition: 250ms ease-in-out;
`;
const Variants = styled.div`
    display: flex;
    align-items: end;
    justify-content: end;
    gap: var(--block-spacer);
    width: 100%;
    height: 100%;
`;
const Variant = styled.div`
    height: 2.25rem;
    padding: 0.25rem;
    margin: -0.25rem;
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.75rem;
    text-align: right;
    opacity: 0.5;
    cursor: pointer;

    &.Active,
    &:hover,
    &:active,
    &:focus {
        opacity: 1;
    }
`;

const Actions = styled.div`
    display: grid;
    grid-template-columns: minmax(auto, auto) auto;
    justify-content: space-between;
    gap: var(--block-spacer-small);
`;
const AddButton = styled(Button)<{ added: boolean }>`
    && {
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        min-width: 100%;
        padding: var(--block-padding-small) var(--block-padding);
        border-radius: var(--block-border-radius-small);
        border: var(--block-border-width) solid var(--primary-foreground);
        color: var(--primary-foreground);
        background: transparent;
        box-shadow: none;
        line-height: 1.75rem;
        font-size: 1.5rem;
        font-weight: 500;
        transition: 250ms ease-in-out;

        &:enabled:hover {
            background: var(--primary-foreground);
            border-color: var(--primary-foreground);
            color: var(--primary-dark);
            box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);
        }

        &:enabled.Added,
        &:enabled:active {
            background: var(--secondary-dark);
            border-color: var(--secondary);
            color: var(--secondary-foreground);
            box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);
        }
    }
`;
const Quantity = styled.div`
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    justify-self: end;
    gap: calc(var(--block-spacer-small));
    height: 100%;
    font-size: 1.5rem;
    line-height: 1.75rem;
    font-weight: 500;
    text-align: center;
    user-select: none;

    svg {
        font-weight: 700;
        stroke-width: 0.4ex;
    }
`;
const QuantityAction = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: end;
    width: var(--block-padding-large);
    height: 100%;
    border-radius: var(--block-border-radius);
    cursor: pointer;
    transition: 250ms ease-in-out;

    &:first-child {
        justify-content: start;
    }

    &.Inactive {
        width: 0px;
        opacity: 0;
        pointer-events: none;
    }

    @media (min-width: 950px) {
        &:hover {
            color: var(--primary-dark);
        }
    }

    &:active {
        color: var(--primary-dark);
        background: var(--primary-foreground);
        border-color: var(--primary);
    }
`;
const QuantityValue = styled.div`
    min-width: 1.25rem;
    font-size: 1.75rem;
`;

const Prices = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    width: 100%;
    text-transform: uppercase;
`;
const Price = styled.div`
    font-size: 2rem;
    line-height: 2.25rem;
    font-weight: 700;
`;
const PreviousPrice = styled.div`
    font-size: 1.5rem;
    line-height: 1.5rem;
    font-weight: 500;
    text-decoration: line-through;
    opacity: 0.75;
`;

const Badges = styled.div`
    position: absolute;
    top: var(--block-spacer-small);
    left: var(--block-spacer-small);
    right: var(--block-spacer-small);
    bottom: var(--block-spacer-small);
    display: flex;
    align-items: start;
    justify-content: start;
    gap: calc(var(--block-spacer-small) / 2);
    z-index: 1;
    pointer-events: none;
`;
const BadgeText = styled.div``;
const BadgePrice = styled(Currency)`
    font-weight: 700;
`;
const Badge = styled.div`
    flex-shrink: 1;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer-small);
    height: auto;
    padding: var(--block-padding-small) var(--block-padding);
    background: var(--accent-primary-light);
    color: var(--accent-primary-text);
    font-weight: 600;
    font-size: 1.25rem;
    line-height: 1.5rem;
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 0.5rem 0px var(--color-block-shadow);

    &.Sale {
        background: var(--color-sale);
    }
    &.From {
        background: var(--color-block);
        color: var(--color-dark);

        ${BadgeText} {
            color: var(--color-dark);
        }
    }
    &.New {
        background: var(--accent-primary-light);
        color: var(--accent-primary-text);
    }
    &.Vegan {
        background: var(--color-green);
    }
`;

interface VariantImageProps {
    image?: ShopifyImage;
}
const VariantImage: FunctionComponent<VariantImageProps> = ({ image }) => {
    if (!image) return null;

    return (
        <Image
            src={image.url}
            alt={image.altText || ''}
            title={image.altText || undefined}
            height={250 || 0}
            width={250 || 0}
            unoptimized={true}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loader={ImageLoader}
        />
    );
};

export const AppendShopifyParameters = ({
    params,
    url
}: {
    params?: string | null;
    url: string;
}): string => {
    if (!params) return url;

    return `${url}${(url.includes('?') && '&') || '?'}${params}`;
};

interface ProductCardProps {
    handle?: string;
    isHorizontal?: boolean;
    store: StoreModel;
    className?: string;
}
const ProductCard: FunctionComponent<ProductCardProps> = ({ store, className }) => {
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const cart = useCart();
    const { product, selectedVariant, setSelectedVariant } = useProduct();
    const [cartStore, setCartStore] = useStore<any>('cart');

    useEffect(() => {
        if (!product) return;

        setSelectedVariant(product?.variants?.edges?.at(-1)?.node || selectedVariant || null);
    }, []);

    useEffect(() => {
        if (quantity > 0) return;
        setQuantity(1);
    }, [quantity]);

    // FIXME: Remove this when our Shopify app does this.
    useEffect(() => {
        if (!globalThis.color_cache) {
            globalThis.color_cache = new TinyCache();
        }

        if (!product?.images?.edges?.at(0)?.node?.url || !(product as any).accent) return;

        const url = product.images.edges.at(0)?.node?.url!;
        if (!globalThis.color_cache.get(url)) {
            globalThis.color_cache.put(url, (product as any).accent, PRODUCT_ACCENT_CACHE_TIMEOUT);
        }
    }, [product]);

    // TODO: Placeholder card?
    if (!product || !selectedVariant) return null;

    const is_new_product =
        product?.createdAt &&
        Math.abs(new Date(product?.createdAt).getTime() - new Date().getTime()) /
            (24 * 60 * 60 * 1000) <
            15; // FIXME: Change this
    const is_vegan_product = product?.tags?.includes('Vegan');
    const is_sale = !!selectedVariant?.compareAtPrice?.amount;

    let short_desc = (product.seo?.description || product.description || '').substring(0, 100);
    // Remove whitespace if it's the last character
    if (short_desc[short_desc.length - 1] === ' ')
        short_desc = short_desc.substring(0, short_desc.length - 1);

    const image = product?.images?.edges?.find(
        (edge) => edge?.node?.id === selectedVariant?.image?.id
    )?.node as ShopifyImage;

    const description =
        (product.seo?.description || product.description) &&
        (product.seo?.description || product.description)?.substring(0, 72) + '\u2026';

    // TODO: Hotlink to variant
    const href = AppendShopifyParameters({
        url: `/products/${product.handle}/`,
        params: (product as any).trackingParameters
    });

    return (
        <Container
            className={`ProductCard ${className || ''}`}
            available={selectedVariant.availableForSale}
            style={
                {
                    '--primary': (product as any).accent?.primary || 'var(--color-block)',
                    '--primary-dark': (product as any).accent?.primary_dark || 'var(--color-block)',
                    '--primary-foreground':
                        (product as any).accent?.primary_foreground || 'var(--color-text-primary)',
                    '--secondary': (product as any).accent?.secondary || 'var(--color-block)',
                    '--secondary-dark':
                        (product as any).accent?.secondary_dark || 'var(--color-block)',
                    '--secondary-foreground':
                        (product as any).accent?.secondary_foreground || 'var(--color-text-primary)'
                } as React.CSSProperties
            }
        >
            <Badges>
                {!is_sale && product.variants?.edges && product.variants.edges.length > 1 ? (
                    <Badge className="From">
                        <BadgeText>From</BadgeText>
                        <BadgePrice
                            price={Number.parseFloat(product.priceRange?.minVariantPrice?.amount!)}
                            currency={product.priceRange?.minVariantPrice?.currencyCode!}
                            store={store}
                        />
                    </Badge>
                ) : null}
                {is_sale ? (
                    <Badge className="Sale">
                        <BadgeText>Sale</BadgeText>
                        <BadgePrice
                            price={Number.parseFloat(selectedVariant.price?.amount!)}
                            currency={selectedVariant.price?.currencyCode}
                            store={store}
                        />
                    </Badge>
                ) : null}
                {is_new_product ? (
                    <Badge className="New">
                        <BadgeText>New!</BadgeText>
                    </Badge>
                ) : null}
                {is_vegan_product ? (
                    <Badge className="Vegan">
                        <BadgeText>Vegan</BadgeText>
                    </Badge>
                ) : null}
            </Badges>
            <ProductImage isHorizontal>
                <Link href={href}>
                    <ProductImageWrapper>
                        <VariantImage image={image} />
                    </ProductImageWrapper>
                </Link>
            </ProductImage>
            <Details className="Details">
                {product.vendor && (
                    <Brand>
                        <Link href={`/collections/${TitleToHandle(product.vendor)}/`}>
                            {product.vendor}
                        </Link>
                    </Brand>
                )}
                <Title title={description}>
                    <Link href={href}>{product.title}</Link>
                </Title>

                {(description && <Description>{description}</Description>) || null}

                <VariantsContainer>
                    <Prices>
                        {selectedVariant.compareAtPrice?.amount && (
                            <PreviousPrice>
                                <Currency
                                    price={Number.parseFloat(selectedVariant.compareAtPrice.amount)}
                                    currency={
                                        selectedVariant.compareAtPrice.currencyCode! ||
                                        Config.i18n.currencies[0]
                                    }
                                    store={store}
                                />
                            </PreviousPrice>
                        )}
                        <Price>
                            <Currency
                                price={Number.parseFloat(selectedVariant.price?.amount || '')}
                                currency={
                                    selectedVariant.price?.currencyCode! ||
                                    Config.i18n.currencies[0]
                                }
                                store={store}
                            />
                        </Price>
                    </Prices>

                    {/* FIXME: Deal with options here */}
                    <Variants>
                        {product.variants?.edges &&
                            product.variants.edges.length > 1 &&
                            product.variants.edges.map((edge: ProductVariantEdge) => {
                                if (!edge.node) return null;
                                const variant = edge.node;
                                let title = variant.title;

                                // Handle variants that should have their weight as their actual title
                                // FIXME: Remove `Size` when we've migrated to using Weight
                                if (
                                    variant.selectedOptions.length === 1 &&
                                    ['Size', 'Weight', 'Storlek'].includes(
                                        variant.selectedOptions.at(0)!.name
                                    ) &&
                                    variant.weight &&
                                    variant.weightUnit
                                ) {
                                    title = ConvertToLocalMeasurementSystem({
                                        locale: router.locale,
                                        weight: variant.weight,
                                        weightUnit: variant.weightUnit
                                    });
                                }

                                return (
                                    <Variant
                                        key={variant.id}
                                        title={variant.selectedOptions
                                            .map((i) => `${i.name}: ${i.value}`)
                                            .join(', ')}
                                        onClick={() => setSelectedVariant(variant)}
                                        className={
                                            selectedVariant.id === variant.id ? 'Active' : ''
                                        }
                                    >
                                        {title}
                                    </Variant>
                                );
                            })}
                    </Variants>
                </VariantsContainer>
            </Details>
            <Actions>
                <AddButton
                    type="button"
                    title="Add to Cart"
                    added={addedToCart}
                    onClick={() => {
                        if (cart.status !== 'idle' && cart.status !== 'uninitialized') return;
                        else if (!product || !selectedVariant) return;

                        setAddedToCart(true);
                        cart.linesAdd([
                            {
                                merchandiseId: selectedVariant.id as string,
                                quantity
                            }
                        ]);

                        setCartStore({
                            ...cartStore,
                            item: {
                                title: product?.title,
                                vendor: product?.vendor,
                                variant: {
                                    title: selectedVariant.title
                                },
                                images: [
                                    {
                                        src: product?.images?.edges?.[0]?.node?.url
                                    }
                                ]
                            },
                            open: true
                        });

                        setTimeout(() => {
                            setAddedToCart(false);
                        }, 3000);
                    }}
                    disabled={
                        !selectedVariant.availableForSale ||
                        (cart.status !== 'idle' && cart.status !== 'uninitialized')
                    }
                >
                    <span data-nosnippet>
                        {(!selectedVariant.availableForSale && 'Out of Stock') ||
                            (addedToCart && 'Added!') ||
                            'Add to Cart'}
                    </span>
                </AddButton>
                <Quantity>
                    <QuantityAction
                        className={quantity > 1 ? '' : 'Inactive'}
                        onClick={() => setQuantity(quantity - 1 || 0)}
                    >
                        <FiMinus />
                    </QuantityAction>
                    <QuantityValue>{quantity}</QuantityValue>
                    <QuantityAction onClick={() => setQuantity(quantity + 1)}>
                        <FiPlus />
                    </QuantityAction>
                </Quantity>
            </Actions>
        </Container>
    );
};

export default ProductCard;

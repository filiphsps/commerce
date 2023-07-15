import { ConvertToLocalMeasurementSystem, PRODUCT_ACCENT_CACHE_TIMEOUT } from '../../api/product';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { FunctionComponent, useEffect, useState } from 'react';
import {
    ProductVariantEdge,
    Image as ShopifyImage
} from '@shopify/hydrogen-react/storefront-api-types';
import styled, { css } from 'styled-components';
import { useCart, useProduct } from '@shopify/hydrogen-react';

import Button from '../Button';
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
    flex: 1 auto;
    overflow: hidden;
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.5rem;
    width: 18rem;
    border-radius: var(--block-border-radius);
    color: var(--foreground);
    scroll-snap-align: start;

    background: var(--background);
    background: radial-gradient(circle, var(--background) 0%, var(--background-dark) 100%);
    padding: var(--block-padding);

    ${({ available }) =>
        !available &&
        css`
            opacity: 0.5;
        `}
`;
export const ProductImage = styled.div<{ isHorizontal?: boolean }>`
    overflow: hidden;
    position: relative;
    height: auto;
    width: 100%;
    padding: 1.75rem;
    border-radius: calc(var(--block-border-radius) * 0.75);
    transition: 250ms ease-in-out;
    user-select: none;
    background: #fefefe;
    box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);

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
        padding: 0.5rem;
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
        mix-blend-mode: multiply;
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
    padding-top: 0.5rem;
`;
const Brand = styled.div`
    font-weight: 400;
    font-size: 1.25rem;
    line-height: 1.75rem;

    &:hover,
    &:active,
    &:focus {
        color: var(--accent-secondary-dark);
    }
`;
const Title = styled.div`
    font-weight: 600;
    font-size: 1.75rem;
    line-height: 2rem;

    &:hover,
    &:active,
    &:focus {
        color: var(--accent-primary);
    }
`;
const VariantsContainer = styled.div`
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr auto;
    justify-content: center;
    align-items: flex-end;
    justify-self: end;
    gap: 1rem;
    width: 100%;
    height: 100%;
    padding-top: 1rem;
    transition: 250ms ease-in-out;
`;
const Variants = styled.div`
    display: flex;
    gap: 1rem;
    min-width: 0px;
`;
const Variant = styled.div`
    border-radius: var(--block-border-radius);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.5rem;
    text-align: center;
    cursor: pointer;
    opacity: 0.5;

    &.Active,
    &:hover,
    &:active,
    &:focus {
        opacity: 1;
        border-color: var(--accent-primary);
    }
`;

const Actions = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: space-between;
    gap: 0.5rem;
`;
const AddButton = styled(Button)`
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.25rem;
    line-height: 1.25rem;
    font-weight: 700;
    transition: 250ms ease-in-out;
    border-radius: calc(var(--block-border-radius) * 0.75);
    padding: 0.75rem 1rem;
    box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);

    @media (min-width: 950px) {
        font-size: 1rem;
        line-height: 1rem;
    }

    &.Added {
        background: var(--accent-secondary-dark);
        font-weight: 700;
    }
`;
const Quantity = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    justify-self: end;
    gap: 0.5rem;
    font-weight: 600;
    text-align: center;
    user-select: none;
`;
const QuantityAction = styled.div`
    overflow: hidden;
    width: 1.25rem;
    margin-top: -0.25rem;
    font-size: 1.5rem;
    font-weight: 700;
    cursor: pointer;
    transition: 250ms ease-in-out;

    &.Inactive {
        width: 0px;
        margin-left: -0.5rem;
    }

    &:hover {
        color: var(--accent-primary);
    }
`;
const QuantityValue = styled.div`
    min-width: 1rem;
    font-size: 1.25rem;

    @media (max-width: 950px) {
        font-size: 1.75rem;
    }
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
    line-height: 2rem;
    font-weight: 700;
`;
const PreviousPrice = styled.div`
    font-size: 1.5rem;
    line-height: 1.5rem;
    font-weight: 500;
    text-decoration: line-through;
    opacity: 0.85;
`;

const Badges = styled.div`
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    bottom: 0.5rem;
    display: flex;
    align-items: start;
    justify-content: start;
    gap: 0.5rem;
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
    gap: 0.5rem;
    height: auto;
    padding: 0.5rem 0.75rem;
    background: var(--accent-primary-light);
    color: var(--color-text-primary);
    font-weight: 600;
    font-size: 1.25rem;
    line-height: 1.25rem;
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);

    &.Sale {
        background: #d91e18;
    }

    &.From {
        background: #efefef;
        color: var(--color-text-dark);
        font-size: 1.25rem;
        line-height: 1.25rem;

        ${BadgeText} {
            color: #404756;
        }
    }

    &.New {
        font-weight: 600;
        font-size: 1.25rem;
        line-height: 1.25rem;
    }
    &.Vegan {
        font-weight: 600;
        font-size: 1.25rem;
        line-height: 1.25rem;
        background: #1b6e1b;
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
            height={image.height || 0}
            width={image.width || 0}
            placeholder={'blur'}
            blurDataURL={`/_next/image?url=${encodeURIComponent(image.url)}&w=16&q=1`}
            sizes={'14rem'}
            loader={ImageLoader}
        />
    );
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

    return (
        <Container
            className={`ProductCard ${className || ''}`}
            available={selectedVariant.availableForSale}
            style={
                {
                    '--background': (product as any).accent?.primary || 'var(--color-block)',
                    '--background-dark': (product as any).accent?.primary_dark || '',
                    '--foreground':
                        (product as any).accent?.primary_foreground || 'var(--color-text-dark)'
                } as React.CSSProperties
            }
        >
            <Badges data-nosnippet>
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
                <Link href={`/products/${product.handle}`}>
                    <ProductImageWrapper>
                        <VariantImage image={image} />
                    </ProductImageWrapper>
                </Link>
            </ProductImage>
            <Details>
                {product.vendor && (
                    <Brand>
                        <Link href={`/collections/${TitleToHandle(product.vendor)}`}>
                            {product.vendor}
                        </Link>
                    </Brand>
                )}
                <Title>
                    <Link href={`/products/${product.handle}`}>{product.title}</Link>
                </Title>

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
                                    ['Size', 'Weight'].includes(
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
                    className={addedToCart ? 'Added' : ''}
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
                    data-nosnippet
                >
                    {(!selectedVariant.availableForSale && 'Out of Stock') ||
                        (addedToCart && 'Added!') ||
                        'Add to Cart'}
                </AddButton>
                <Quantity>
                    <QuantityAction
                        className={quantity > 1 ? '' : 'Inactive'}
                        onClick={() => setQuantity(quantity - 1)}
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

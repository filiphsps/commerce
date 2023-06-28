import { FiMinus, FiPlus } from 'react-icons/fi';
import { FunctionComponent, useEffect, useState } from 'react';
import {
    ProductVariantEdge,
    Image as ShopifyImage
} from '@shopify/hydrogen-react/storefront-api-types';
import { useCart, useProduct } from '@shopify/hydrogen-react';

import Button from '../Button';
import { Config } from '../../util/Config';
import Currency from '../Currency';
import Image from 'next/legacy/image';
import Link from 'next/link';
import { StoreModel } from '../../models/StoreModel';
import TitleToHandle from '../../util/TitleToHandle';
import styled from 'styled-components';
import { useStore } from 'react-context-hook';

const Container = styled.div`
    overflow: hidden;
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.5rem;
    min-width: 16rem;
    padding: 1rem;
    border: 0.2rem solid #e9e9e9;
    box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);
    border-radius: var(--block-border-radius);
    background: #efefef;
    scroll-snap-align: start;

    @media (max-width: 950px) {
        padding: 0.5rem;
    }
`;
const ProductImage = styled.div`
    height: 15rem;
    width: calc(100% + 2rem);
    padding: 1.25rem;
    margin: -1rem -1rem 0px -1rem;
    background: #fefefe;
    border-radius: var(--block-border-radius);
    border-bottom-left-radius: 0px;
    border-bottom-right-radius: 0px;
    transition: 150ms ease-in-out;
    user-select: none;

    &:hover {
        padding: 0.5rem;
    }
`;
const ProductImageWrapper = styled.div`
    position: relative;
    height: 100%;
    width: 100%;

    img {
        object-fit: contain;
        mix-blend-mode: multiply;
    }
`;

const Details = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding-top: 0.5rem;
`;
const Brand = styled.div`
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.25rem;
    color: #404756;

    &:hover,
    &:active,
    &:focus {
        color: var(--accent-secondary-dark);
    }
`;
const Title = styled.div`
    //flex-grow: 1;
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.75rem;
    line-height: 1.75rem;

    &:hover,
    &:active,
    &:focus {
        color: var(--accent-primary);
    }
`;
const Description = styled.div`
    padding: 0.25rem 0px 0.5rem 0px;
    flex-grow: 1;
    font-size: 1.15rem;
    color: #404756;
`;
const VariantsContainer = styled.div`
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr auto;
    justify-content: center;
    align-items: flex-end;
    gap: 1rem;
    width: 100%;
    padding-top: 1rem;
    transition: 150ms ease-in-out;
`;
const Variants = styled.div`
    display: flex;
    gap: 0.75rem;
    min-width: 0px;
`;
const Variant = styled.div`
    height: 1.4rem;
    border-radius: var(--block-border-radius);
    font-weight: 600;
    font-size: 1.15rem;
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
    grid-template-columns: 1fr auto;
    gap: 1rem;
`;
const AddButton = styled(Button)`
    padding: 1rem;
    font-size: 1.25rem;
    width: 100%;
    transition: 150ms ease-in-out;

    &.Added {
        background: var(--accent-secondary-dark);
        font-weight: 700;
    }
`;
const Quantity = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 600;
    text-align: center;
    user-select: none;
`;
const QuantityAction = styled.div`
    overflow: hidden;
    width: 1rem;
    margin-top: -0.25rem;
    font-size: 1rem;
    cursor: pointer;
    transition: 150ms ease-in-out;

    @media (max-width: 950px) {
        font-size: 1.5rem;
        width: 1.5rem;
    }

    &.Inactive {
        width: 0px;
        margin-left: -0.5rem;
    }

    &:hover {
        color: var(--accent-primary);
    }
`;
const QuantityValue = styled.div`
    min-width: 1.25rem;
    font-size: 1.5rem;

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
    font-size: 1.5rem;
    font-weight: 700;

    &.Discount {
        color: #d91e18;
    }
`;
const PreviousPrice = styled.div`
    font-weight: 700;
    text-decoration: line-through;
    color: #404756;
`;

const Badges = styled.div`
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    z-index: 1;
`;
const BadgeText = styled.div``;
const BadgePrice = styled(Currency)`
    font-size: 1.25rem;
    font-weight: 700;
`;
const Badge = styled.div`
    flex-shrink: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    height: auto;
    padding: 0.5rem 0.75rem;
    background: var(--accent-primary);
    color: var(--color-text-primary);
    text-transform: uppercase;
    font-weight: 600;

    &.Sale {
        background: #d91e18;
    }

    &.From {
        background: #efefef;
        color: var(--color-text-dark);

        ${BadgeText} {
            color: #404756;
        }
    }

    &.New {
        font-weight: 700;
        font-size: 1.25rem;
    }
    &.Vegan {
        font-weight: 700;
        font-size: 1.25rem;
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
            layout="fill"
            alt={image.altText || ''}
            title={image.altText || undefined}
        />
    );
};

interface ProductCardProps {
    handle?: string;
    isHorizontal?: boolean;
    store: StoreModel;
}
const ProductCard: FunctionComponent<ProductCardProps> = ({ store }) => {
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const cart = useCart();
    const { product, selectedVariant, setSelectedVariant } = useProduct();
    const [cartStore, setCartStore] = useStore<any>('cart');

    useEffect(() => {
        if (quantity > 0) return;
        setQuantity(1);
    }, [quantity]);

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

    return (
        <Container className="ProductCard">
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
            <ProductImage>
                <Link href={`/products/${product.handle}`}>
                    <ProductImageWrapper>
                        <VariantImage
                            image={
                                product?.images?.edges?.find(
                                    (edge) => edge?.node?.id === selectedVariant?.image?.id
                                )?.node as ShopifyImage
                            }
                        />
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
                <Description>
                    {short_desc}
                    {short_desc.length > 5 ? '...' : ''}
                </Description>

                <VariantsContainer>
                    <Prices>
                        {selectedVariant.compareAtPrice?.amount && (
                            <PreviousPrice>
                                <Currency
                                    price={
                                        Number.parseFloat(selectedVariant.compareAtPrice.amount) *
                                        quantity
                                    }
                                    currency={
                                        selectedVariant.compareAtPrice.currencyCode! ||
                                        Config.i18n.currencies[0]
                                    }
                                    store={store}
                                />
                            </PreviousPrice>
                        )}
                        <Price
                            className={(selectedVariant.compareAtPrice?.amount && 'Discount') || ''}
                        >
                            <Currency
                                price={
                                    Number.parseFloat(selectedVariant.price?.amount || '') *
                                    quantity
                                }
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
                            product.variants.edges.map((edge: ProductVariantEdge) => (
                                <Variant
                                    key={edge.node.id}
                                    onClick={() => setSelectedVariant(edge.node)}
                                    className={selectedVariant.id === edge.node.id ? 'Active' : ''}
                                >
                                    {edge.node.title}
                                </Variant>
                            ))}
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

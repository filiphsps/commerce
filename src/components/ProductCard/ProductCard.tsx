import { FiMinus, FiPlus } from 'react-icons/fi';
import { FunctionComponent, useEffect, useState } from 'react';
import { ProductImageModel, ProductModel } from '../../models/ProductModel';

import Button from '../Button';
import Currency from '../Currency';
import Image from 'next/image';
import Link from 'next/link';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';

const Container = styled.div`
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.5rem;
    min-width: 16rem;
    max-width: 24rem;
    padding: 1rem;
    border: 0.2rem solid #e9e9e9;
    box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);
    border-radius: var(--block-border-radius);
    background: #efefef;
    scroll-snap-align: start;
`;
const ProductImage = styled.div`
    height: 14rem;
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
    font-size: 1.65rem;

    &:hover,
    &:active,
    &:focus {
        color: var(--accent-primary);
    }
`;
const Description = styled.div`
    padding-top: 0.25rem;
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
    padding: 0.75rem 1rem;
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
        color: #0e0e0e;

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
        background: #228b22;
    }
`;

interface VariantImageProps {
    image: ProductImageModel;
}
const VariantImage: FunctionComponent<VariantImageProps> = ({ image }) => {
    const { src, alt /*, height, width*/ } = image;

    return (
        <Image
            src={src}
            /*width={width}
            height={height}*/
            layout="fill"
            alt={alt}
            title={alt}
        />
    );
};

interface ProductCardProps {
    handle?: string;
    data?: ProductModel;
    isHorizontal?: boolean;
}
const ProductCard: FunctionComponent<ProductCardProps> = ({ data }) => {
    const [variantIndex, setVariantIndex] = useState(data.variants.length - 1);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const cart = useCart();

    const {
        images,
        variants,
        vendor,
        handle,
        title,
        created_at,
        id,
        seo,
        description,
        tags
    } = data;
    const variant = variants[variantIndex];

    const is_new_product =
        Math.abs(new Date(created_at).getTime() - new Date().getTime()) /
            (24 * 60 * 60 * 1000) <
        45;
    const is_vegan_product = tags?.includes('Vegan');
    const is_sale = !!variants[variantIndex].pricing.compare_at_range;

    let short_desc = (seo.description || description).substring(0, 100);
    // Remove whitespace if it's the last character
    if (short_desc[short_desc.length - 1] === ' ')
        short_desc = short_desc.substring(0, short_desc.length - 1);

    useEffect(() => {
        if (quantity > 0) return;
        setQuantity(1);
    }, [quantity]);

    return (
        <Container className="ProductCard">
            <Badges>
                {!is_sale && data.variants.length > 1 ? (
                    <Badge className="From">
                        <BadgeText>From</BadgeText>
                        <BadgePrice
                            price={variants[0].pricing.range}
                            currency={variants[0].pricing.currency}
                        />
                    </Badge>
                ) : null}
                {is_sale ? (
                    <Badge className="Sale">
                        <BadgeText>Sale</BadgeText>
                        <BadgePrice
                            price={variant.pricing.range}
                            currency={variant.pricing.currency}
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
                <Link href={`/products/${handle}`}>
                    <a>
                        <ProductImageWrapper>
                            <VariantImage
                                image={images[variant.default_image]}
                            />
                        </ProductImageWrapper>
                    </a>
                </Link>
            </ProductImage>
            <Details>
                <Brand>
                    <Link href={`/collections/${vendor.handle}`}>
                        <a>{vendor.title}</a>
                    </Link>
                </Brand>
                <Title>
                    <Link href={`/products/${handle}`}>
                        <a>{title}</a>
                    </Link>
                </Title>
                <Description>
                    {short_desc}
                    {short_desc.length > 5 ? '...' : ''}
                </Description>

                <VariantsContainer>
                    <Prices>
                        {variants[variantIndex].pricing.compare_at_range ? (
                            <PreviousPrice>
                                <Currency
                                    price={
                                        variants[variantIndex].pricing
                                            .compare_at_range * quantity
                                    }
                                    currency={
                                        variants[variantIndex].pricing.currency
                                    }
                                />
                            </PreviousPrice>
                        ) : null}
                        <Price
                            className={
                                variants[variantIndex].pricing.compare_at_range
                                    ? 'Discount'
                                    : ''
                            }
                        >
                            <Currency
                                price={
                                    variants[variantIndex].pricing.range *
                                    quantity
                                }
                                currency={
                                    variants[variantIndex].pricing.currency
                                }
                            />
                        </Price>
                    </Prices>

                    <Variants>
                        {variants.length > 1
                            ? variants.map((variant, index) => (
                                  <Variant
                                      key={variant.id}
                                      onClick={() => setVariantIndex(index)}
                                      className={
                                          variantIndex === index ? 'Active' : ''
                                      }
                                  >
                                      {variant.title}
                                  </Variant>
                              ))
                            : null}
                    </Variants>
                </VariantsContainer>
            </Details>
            <Actions>
                <AddButton
                    className={addedToCart ? 'Added' : ''}
                    onClick={() => {
                        setAddedToCart(true);
                        cart.addItem(
                            {
                                id: `${id}#${variants[variantIndex].id}`,
                                price: variants[variantIndex].pricing.range,
                                quantity,

                                title: title,
                                variant_title: variants[variantIndex].title
                            },
                            quantity
                        );

                        setTimeout(() => {
                            setAddedToCart(false);
                        }, 3000);
                    }}
                    disabled={!variant?.available}
                >
                    <span data-nosnippet>
                        {!variant?.available
                            ? 'Out of Stock'
                            : (addedToCart && 'Added!') || 'Add to Cart'}
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

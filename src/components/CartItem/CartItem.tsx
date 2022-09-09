import React, { FunctionComponent, useEffect, useState } from 'react';

import Currency from '../Currency';
import { FiTrash } from 'react-icons/fi';
import Image from 'next/image';
import Input from '../Input';
import Link from 'next/link';
import Loader from '../Loader';
import { ProductIdApi } from '../../api/product';
import { ProductModel } from '../../models/ProductModel';
import { ProductVariantModel } from '../../models/ProductVariantModel';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Content = styled.tr`
    width: 100%;
    min-width: 100%;
    height: 8rem;
`;
const Section = styled.td``;
const SectionContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    height: 6rem;
    margin: 1rem 0px;
    margin-left: 1rem;
`;

const ImageWrapper = styled.div`
    max-width: 8rem;
    height: 8rem;
    width: 8rem;
    max-width: 8rem;
    padding: 0.5rem;

    img {
        mix-blend-mode: multiply;
        width: 100%;
        height: 100%;
    }
`;
const ProductImage = styled(Section)`
    display: block;
    height: 8rem;
    width: 100%;
    max-width: 8rem;
    background: #fefefe;
    border-radius: var(--block-border-radius);
    border: 0.2rem solid #fefefe;
    cursor: pointer;
    transition: 250ms ease-in-out;

    &:hover {
        border-color: var(--accent-primary);
    }

    ${ImageWrapper} {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;

        span {
            width: 100% !important;
            height: 100% !important;
        }
    }
`;

const Quantity = styled(SectionContent)`
    text-align: center;
    input {
        width: 6rem;
        padding: 0.75rem 1rem;
        background: #fefefe;
        box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);

        @media (max-width: 950px) {
            width: 4rem;
        }

        &:hover,
        &:active,
        &:focus {
            border-color: var(--accent-primary-dark);
        }
    }
`;

const Details = styled(SectionContent)`
    text-transform: uppercase;
`;
const DetailsBrand = styled.div`
    font-weight: 700;
    letter-spacing: 0.05rem;
    color: #404756;
    transition: 250ms ease-in-out;

    &:hover {
        color: var(--accent-primary);
    }
`;
const DetailsTitle = styled.div`
    font-size: 1.75rem;
    font-weight: 600;
    transition: 250ms ease-in-out;

    &:hover {
        color: var(--accent-primary);
    }

    @media (max-width: 950px) {
        font-size: 1.5rem;
    }
`;
const DetailsVariant = styled.div`
    margin-top: 0.5rem;

    @media (max-width: 950px) {
        display: none;
    }
`;

const Badge = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.25rem 0.5rem;
    text-transform: uppercase;
    font-size: 1rem;
    font-weight: 700;
    background: var(--accent-secondary-dark);
    color: var(--color-text-primary);
`;

const Price = styled(SectionContent)`
    font-weight: 700;
    font-size: 1.5rem;
`;

const Actions = styled(SectionContent)`
    width: 2rem;
    justify-content: center;
    align-items: flex-start;
    margin-left: auto;
    user-select: none;
`;
const Action = styled.div`
    cursor: pointer;

    &:hover {
        // FIXME: Only use this for the remove action
        color: #d91e18;
    }
`;

interface CartItemProps {
    total_items?: number;
    data?: any;
}
const CartItem: FunctionComponent<CartItemProps> = (props) => {
    // TODO: remove replace once we've cleared all broken carts
    const product_id = props.data.id
        .split('#')[0]
        .replace('gid://shopify/Product/', '');
    const variant_id = props.data.id
        .split('#')[1]
        .replace('gid://shopify/ProductVariant/', '');

    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const cart = useCart();
    const { data } = useSWR([product_id], (id) =>
        ProductIdApi({ id: id, locale: router?.locale })
    ) as any;
    const product: ProductModel = data;
    const [variant, setVariant] = useState<ProductVariantModel>(null);

    useEffect(() => {
        if (!product) return;

        setVariant(
            product?.variants?.find((variant) => variant?.id === variant_id)
        );
    }, [product]);

    const changeAmount = (event: any) => {
        if (event?.target?.value == props?.data?.quantity) return;
        cart.updateItemQuantity(
            `${product?.id}#${variant?.id}`,
            parseInt(event?.target?.value) || 0
        );
    };

    if (!product || !variant || isLoading) {
        return (
            <div
                className="CartItem"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Loader light />
            </div>
        );
    }

    let discount = variant?.pricing?.compare_at_range
        ? variant?.pricing?.compare_at_range - variant?.pricing?.range
        : 0;
    return (
        <Content>
            <ProductImage>
                <ImageWrapper>
                    <Link href={`/products/${product?.handle}`}>
                        <Image
                            src={product?.images?.[variant?.default_image]?.src}
                            layout="responsive"
                            width="6rem"
                            height="6rem"
                            objectFit="contain"
                        />
                    </Link>
                </ImageWrapper>
            </ProductImage>
            <Section className="CartItem-Content">
                <Details>
                    <DetailsBrand>
                        <Link href={`/collections/${product?.vendor?.handle}`}>
                            {product?.vendor?.title}
                        </Link>
                    </DetailsBrand>
                    <DetailsTitle>
                        <Link href={`/products/${product?.handle}`}>
                            {product?.title}
                        </Link>
                    </DetailsTitle>
                    <DetailsVariant>
                        <Badge>{variant?.title}</Badge>
                    </DetailsVariant>
                </Details>
            </Section>
            <Section className="CartItem-Quantity">
                <Quantity>
                    <Input
                        className="Input"
                        defaultValue={props?.data?.quantity}
                        onBlur={(event) => changeAmount(event)}
                        onInput={(event) => {
                            (event as any).target.value = (
                                event as any
                            ).target.value
                                .replace(/[^0-9.]/g, '')
                                .replace(/(\..*?)\..*/g, '$1');

                            // TODO: Figure out a good max
                            if (
                                Number.parseInt(
                                    (event as any).target.value,
                                    10
                                ) > 500
                            )
                                (event as any).target.value = 500;
                        }}
                        onKeyPress={(event) => {
                            if (event.key !== 'Enter') return;

                            changeAmount(event);
                        }}
                    />
                </Quantity>
            </Section>
            <Section>
                <Price>
                    {discount > 0 && (
                        <span>
                            <Currency
                                price={
                                    variant?.pricing?.compare_at_range *
                                    props?.data?.quantity
                                }
                                currency={variant?.pricing?.currency}
                                className="Currency-Sale"
                            />
                        </span>
                    )}
                    <Currency
                        price={variant?.pricing?.range * props?.data?.quantity}
                        currency={variant?.pricing?.currency}
                        className={discount > 0 && 'Currency-Discount'}
                    />
                </Price>
            </Section>
            <Section>
                <Actions>
                    <Action
                        onClick={() => {
                            cart.removeItem(`${product?.id}#${variant?.id}`);
                        }}
                    >
                        <FiTrash className="Icon" />
                    </Action>
                </Actions>
            </Section>
        </Content>
    );
};

export default CartItem;

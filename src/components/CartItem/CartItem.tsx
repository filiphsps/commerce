import React, { FunctionComponent, useEffect, useState } from 'react';

import { Config } from '../../util/Config';
import Currency from '../Currency';
import { FiTrash } from 'react-icons/fi';
import Image from 'next/legacy/image';
import Input from '../Input';
import Link from 'next/link';
import Loader from '../Loader';
import { ProductIdApi } from '../../api/product';
import { ProductModel } from '../../models/ProductModel';
import { ProductVariantModel } from '../../models/ProductVariantModel';
import { StoreModel } from '../../models/StoreModel';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Section = styled.td``;
const SectionContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    height: 100%;
`;

const Details = styled(SectionContent)`
    text-transform: uppercase;
`;
const DetailsBrand = styled.div`
    font-weight: 700;
    letter-spacing: 0.05rem;
    color: #404756;
    transition: 150ms ease-in-out;

    &:hover {
        color: var(--accent-primary);
    }
`;
const DetailsTitle = styled.div`
    font-size: 1.75rem;
    font-weight: 700;
    opacity: 0.75;
    transition: 150ms ease-in-out;

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

const Content = styled.tr`
    display: grid;
    position: relative;
    min-height: 10rem;
    width: 100vw;
    max-width: 100%;
    grid-template-columns: 8rem 1fr 4rem 6rem 4rem;
    grid-template-rows: 1fr;
    grid-template-areas: 'image meta quantity price actions';
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.5rem 0px;

    padding: 1rem;
    background: #efefef;
    border-radius: var(--block-border-radius);

    @media (max-width: 950px) {
        grid-template-columns: 8rem 1fr 5rem 6rem;
        grid-template-areas: 'image meta quantity price';
    }

    &.Sale {
        padding: 0.8rem;
        border: 0.2rem solid #d91e18;

        ${DetailsTitle} {
            color: #d91e18;
        }
    }
`;

const ImageWrapper = styled.div`
    max-width: 8rem;
    min-height: 8rem;
    width: 8rem;
    max-width: 8rem;
    padding: 0.5rem;

    a {
        display: block;
        width: 100%;
        height: 100%;
    }

    img {
        display: block;
        mix-blend-mode: multiply;
        width: 100%;
        height: 100%;
    }
`;
const ProductImage = styled(Section)`
    grid-area: image;
    display: block;
    height: 100%;
    width: 100%;
    max-width: 8rem;
    background: #fefefe;
    border-radius: var(--block-border-radius);
    border: 0.2rem solid #fefefe;
    cursor: pointer;
    transition: 150ms ease-in-out;

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
    grid-area: quantity;
    text-align: center;
    width: 100%;
    height: 3rem;

    input {
        height: 100%;
        width: 100%;
        padding: 0.5rem 0.5rem;
        background: var(--color-text-primary);
        box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);
        border-width: 0.1rem;
        font-size: 1.25rem;

        @media (max-width: 950px) {
            width: 4rem;
            padding: 0.35rem 0.25rem;
            font-size: 1.15rem;
        }

        &:hover,
        &:active,
        &:focus {
            border-color: var(--accent-primary-dark);
        }
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
    width: 100%;
    height: 100%;
    font-weight: 700;
    font-size: 1.5rem;
    text-align: center;

    .Currency {
        display: flex;
        //justify-content: flex-end;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        overflow-wrap: anywhere;
        hyphens: auto;
    }

    &.Sale {
        display: grid;
        grid-template-rows: 1fr 1fr;
        justify-content: center;
        align-items: center;
        gap: 0.15rem;
        height: 4rem;

        .Currency {
            max-height: 2.15rem;
            width: 100%;
        }
    }

    @media (max-width: 950px) {
        text-align: right;
    }
`;

const Actions = styled(SectionContent)`
    display: flex;
    justify-content: center;
    align-items: flex-end;
    flex-direction: column;
    width: 100%;
    user-select: none;
`;
const Action = styled.div`
    cursor: pointer;
    text-align: center;
    width: 2.25rem;
    max-width: 2.25rem;
    font-size: 1.25rem;
    user-select: none;

    &:hover {
        // FIXME: Only use this for the remove action
        color: #d91e18;
        border-color: #d91e18;
    }
`;

const MetaSection = styled(Section)`
    grid-area: meta;
`;
const QuantitySection = styled(Section)`
    grid-area: quantity;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;

    @media (max-width: 950px) {
        display: flex;
        justify-content: flex-start;
        padding-top: 0.5rem;

        ${Quantity} {
            height: 3.25rem;
        }
    }
`;
const PriceSection = styled(Section)`
    position: relative;
    overflow: hidden;
    grid-area: price;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    width: 100%;
    height: 100%;

    .Currency {
        // FIXME: Wrap bug numbers.
    }

    ${Price} .Currency.Currency-Sale {
        font-size: 1.25rem;
        width: auto;
    }
`;
const ActionsSection = styled(Section)`
    grid-area: actions;

    @media (max-width: 950px) {
        position: absolute;
        right: 9.25rem;
        top: 6rem;
        padding: 0.25rem;
        border-radius: 100%;
        transition: 150ms ease-in-out;
        background-color: var(--color-text-primary);
        border: 0.2rem solid #efefef;
        cursor: pointer;
        box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);

        ${Actions} {
            ${Action} {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 2.25rem;
                height: 2.25rem;
                font-size: 1.5rem;
                color: unset;
            }
        }

        &:hover {
            color: var(--color-text-primary);
            border-color: #d91e18;
            background-color: #d91e18;
        }
    }
`;

interface CartItemProps {
    total_items?: number;
    data?: any;
    store: StoreModel;
}
const CartItem: FunctionComponent<CartItemProps> = (props) => {
    const router = useRouter();
    const cart = useCart();
    const TempImage = Image as any;

    const locale =
        router?.locale && router?.locale != '__default'
            ? router?.locale
            : Config.i18n.locales[0];

    // TODO: remove replace once we've cleared all broken carts
    const product_id = props.data.id
        .split('#')[0]
        .replace('gid://shopify/Product/', '');
    const variant_id = props.data.id
        .split('#')[1]
        .replace('gid://shopify/ProductVariant/', '');

    const { data } = useSWR([product_id], (id) =>
        ProductIdApi({ id: id, locale })
    ) as any;
    const product: ProductModel = data;
    const [variant, setVariant] = useState<ProductVariantModel | null>(null);

    useEffect(() => {
        if (!product) return;

        setVariant(
            product?.variants?.find?.(
                (variant) => variant?.id === variant_id
            ) || null
        );
    }, [product]);

    const changeAmount = (event: any) => {
        if (event?.target?.value == props?.data?.quantity) return;
        cart.updateItemQuantity(
            `${product?.id}#${variant?.id}`,
            parseInt(event?.target?.value) || 0
        );
    };

    if (!product || !variant) {
        return (
            <Content>
                <ProductImage>
                    <ImageWrapper></ImageWrapper>
                </ProductImage>
                <Section />
                <Section>
                    <Loader light />
                </Section>
                <Section />
                <Section />
            </Content>
        );
    }

    let discount = variant?.pricing?.compare_at_range
        ? variant?.pricing?.compare_at_range - variant?.pricing?.range
        : 0;
    return (
        <Content className={(discount > 0 && 'Sale') || ''}>
            <ProductImage>
                <ImageWrapper>
                    <Link href={`/products/${product?.handle}`}>
                        <TempImage
                            src={product?.images?.[variant?.default_image]?.src}
                            layout="responsive"
                            width="6rem"
                            height="6rem"
                            objectFit="contain"
                        />
                    </Link>
                </ImageWrapper>
            </ProductImage>
            <MetaSection>
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
            </MetaSection>
            <QuantitySection className="QuantitySection">
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

                            // TODO: Figure out a good limit
                            if (
                                Number.parseInt(
                                    (event as any).target.value,
                                    10
                                ) > 250
                            )
                                (event as any).target.value = 250;
                        }}
                        onKeyPress={(event) => {
                            if (event.key !== 'Enter') return;

                            changeAmount(event);
                        }}
                    />
                </Quantity>
            </QuantitySection>
            <PriceSection>
                <Price className={(discount > 0 && 'Sale') || ''}>
                    {discount > 0 &&
                        typeof variant.pricing.compare_at_range ===
                            'number' && (
                            <Currency
                                price={
                                    variant.pricing.compare_at_range! *
                                    props?.data?.quantity
                                }
                                currency={variant?.pricing?.currency}
                                className="Currency-Sale"
                                store={props.store}
                            />
                        )}
                    <Currency
                        price={variant?.pricing?.range * props?.data?.quantity}
                        currency={variant?.pricing?.currency}
                        className={(discount > 0 && 'Currency-Discount') || ''}
                        store={props.store}
                    />
                </Price>
            </PriceSection>
            <ActionsSection>
                <Actions>
                    <Action
                        onClick={() => {
                            cart.removeItem(`${product?.id}#${variant?.id}`);
                        }}
                    >
                        <FiTrash className="Icon" />
                    </Action>
                </Actions>
            </ActionsSection>
        </Content>
    );
};

export default CartItem;

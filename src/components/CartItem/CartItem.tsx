import {
    CartLineQuantity,
    CartLineQuantityAdjustButton,
    useCart,
    useCartLine
} from '@shopify/hydrogen-react';
import { FiMinus, FiPlus, FiTrash } from 'react-icons/fi';
import React, { FunctionComponent, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

import { Config } from '../../util/Config';
import Currency from '../Currency';
import Image from 'next/legacy/image';
import Link from 'next/link';
import Loader from '../Loader';
import { ProductApi } from '../../api/product';
import { ProductVariant } from '@shopify/hydrogen-react/storefront-api-types';
import { StoreModel } from '../../models/StoreModel';
import TitleToHandle from '../../util/TitleToHandle';
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
    width: 100%;
    text-transform: uppercase;
    display: flex;
    flex-direction: column;
    color: var(--color-text-dark);
`;
const DetailsBrand = styled.div`
    font-weight: 700;
    letter-spacing: 0.05rem;
    transition: 150ms ease-in-out;

    &:hover {
        color: var(--accent-primary);
    }
`;
const DetailsTitle = styled.div`
    font-size: 1.75rem;
    font-weight: 700;
    transition: 150ms ease-in-out;
    word-wrap: break-word;
    hyphens: auto;
    padding-bottom: 0.25rem;

    &:hover {
        color: var(--accent-primary);
    }

    @media (max-width: 950px) {
        font-size: 1.5rem;
    }
`;
const DetailsVariant = styled.div``;

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

const Price = styled(SectionContent)`
    width: 100%;
    height: 100%;
    font-weight: 700;
    font-size: 1.5rem;
    text-align: center;

    .Currency {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
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
        text-align: start;
        align-items: start;
        justify-content: center;

        &.Sale {
            display: flex;
            justify-content: center;
            align-items: start;
            gap: 0px;

            .Currency-Sale {
                height: 1.25rem;
            }
            .Currency-Discount {
                height: 2.5rem;
            }
        }

        .Currency {
            justify-content: start;
            line-height: 100%;
        }
    }
`;

const MetaSection = styled(Section)`
    overflow: hidden;
    grid-area: meta;
    min-height: 0px;
    min-width: 0px;
`;

const RemoveButton = styled(CartLineQuantityAdjustButton)`
    &:hover {
        background: var(--color-danger);
        color: var(--color-text-primary);
    }
`;
const Quantity = styled.div<{ disabled?: boolean }>`
    height: 3rem;
    background: var(--color-text-primary);
    border-radius: var(--block-border-radius);
    transition: 150ms all ease-in-out;

    ${(props) =>
        props.disabled &&
        css`
            opacity: 0.5;
            cursor: wait;

            input,
            button {
                cursor: inherit;
            }
        `}

    input {
        overflow: hidden;
        height: 3rem;
        width: 3rem;
        border: none;
        border-radius: 0px;
        font-size: 1.25rem;
        text-align: center;
        outline: none;
    }

    button:hover {
        background: var(--accent-primary);
        color: var(--color-text-primary);
    }
`;
const QuantitySection = styled(Section)`
    grid-area: quantity;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    gap: 1rem;
    padding-left: 1rem;

    button {
        height: 3rem;
        width: 3rem;
        text-align: center;
        font-size: 1.25rem;
        line-height: 100%;
        border-radius: var(--block-border-radius);
    }

    @media (max-width: 950px) {
        display: flex;
        justify-content: flex-start;
        padding-top: 0.5rem;
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

    ${Price} .Currency.Currency-Sale {
        font-size: 1.25rem;
        width: auto;
    }
`;

const Content = styled.tr`
    overflow: hidden;
    display: grid;
    position: relative;
    min-height: 10rem;
    width: calc(100vw - 2rem);
    max-width: 100%;
    grid-template-columns: 8rem 1fr 6rem 14rem;
    grid-template-rows: 1fr;
    grid-template-areas: 'image meta price quantity';
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.5rem 0px;

    padding: 1rem;
    background: #efefef;
    border-radius: var(--block-border-radius);

    @media (max-width: 950px) {
        grid-template-columns: 8rem 1fr 14rem;
        grid-template-areas:
            'image meta meta'
            'image price quantity';
    }
`;

interface CartItemProps {
    store: StoreModel;
}
const CartItem: FunctionComponent<CartItemProps> = ({ store }) => {
    const router = useRouter();
    const cart = useCart();
    const line = useCartLine();
    const TempImage = Image as any;

    const locale =
        router?.locale && router?.locale != 'x-default' ? router?.locale : Config.i18n.locales[0];

    const { data: product } = useSWR([line?.merchandise?.product?.handle!], ([handle]) =>
        ProductApi({ handle: handle || '', locale })
    );
    const [variant, setVariant] = useState<ProductVariant | null>(null);

    useEffect(() => {
        if (!product) return;

        setVariant(
            product?.variants.edges.find?.((edge) => edge.node.id === line.merchandise?.id)?.node ||
                null
        );
    }, [product]);

    if (!line || !product || !variant) {
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
            </Content>
        );
    }

    let discount =
        (variant.compareAtPrice?.amount &&
            Number.parseFloat(variant?.compareAtPrice?.amount || '') -
                Number.parseFloat(variant?.price.amount || '')) ||
        0;
    return (
        <Content className={(discount > 0 && 'Sale') || ''}>
            <ProductImage>
                <ImageWrapper>
                    <Link href={`/products/${product?.handle}`}>
                        <TempImage
                            src={
                                product.images.edges.find(
                                    (edge) => edge.node.id === variant.image?.id
                                )?.node.url || ''
                            }
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
                        <Link href={`/collections/${TitleToHandle(product?.vendor)}`}>
                            {product?.vendor}
                        </Link>
                    </DetailsBrand>
                    <DetailsTitle>
                        <Link href={`/products/${product?.handle}`}>{product?.title}</Link>
                    </DetailsTitle>
                    <DetailsVariant>{variant?.title}</DetailsVariant>
                </Details>
            </MetaSection>

            <PriceSection>
                <Price className={(discount > 0 && 'Sale') || ''}>
                    {discount > 0 && variant.compareAtPrice && (
                        <Currency
                            price={
                                Number.parseFloat(variant.compareAtPrice?.amount || '') *
                                line.quantity!
                            }
                            currency={variant.price.currencyCode || Config.i18n.currencies[0]}
                            className="Currency-Sale"
                            store={store}
                        />
                    )}
                    <Currency
                        price={Number.parseFloat(variant.price?.amount || '') * line.quantity!}
                        currency={variant.price.currencyCode || Config.i18n.currencies[0]}
                        className={(discount > 0 && 'Currency-Discount') || ''}
                        store={store}
                    />
                </Price>
            </PriceSection>

            <QuantitySection className="QuantitySection">
                <Quantity disabled={cart.status !== 'idle'}>
                    <CartLineQuantityAdjustButton adjust="decrease">
                        <FiMinus />
                    </CartLineQuantityAdjustButton>
                    <CartLineQuantity
                        as={
                            ((props: any) => {
                                return (
                                    <input
                                        disabled={cart.status !== 'idle'}
                                        value={props.children}
                                        onInput={(event) => {
                                            event.currentTarget.value = event.currentTarget.value
                                                .replace(/[^0-9.]/g, '')
                                                .replace(/(\..*?)\..*/g, '$1');

                                            if (event.currentTarget.value === '') {
                                                cart.linesRemove([line.id!]);
                                                return;
                                            }

                                            const quantity = Number.parseInt(
                                                event.currentTarget.value
                                            );
                                            if (quantity === line.quantity) return;

                                            cart.linesUpdate([
                                                {
                                                    id: line.id!,
                                                    quantity: quantity
                                                }
                                            ]);
                                        }}
                                    />
                                );
                            }) as any
                        }
                    />
                    <CartLineQuantityAdjustButton adjust="increase">
                        <FiPlus />
                    </CartLineQuantityAdjustButton>
                </Quantity>

                <RemoveButton adjust="remove">
                    <FiTrash />
                </RemoveButton>
            </QuantitySection>
        </Content>
    );
};

export default CartItem;

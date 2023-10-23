'use client';

import { CartLineQuantity, CartLineQuantityAdjustButton, Money, useCart, useCartLine } from '@shopify/hydrogen-react';
import { FiMinus, FiPlus, FiTrash } from 'react-icons/fi';
import styled, { css } from 'styled-components';
import { useEffect, useState } from 'react';

import { Config } from '@/utils/Config';
import type { FunctionComponent } from 'react';
import Image from 'next/legacy/image';
import Link from '@/components/link';
import Loader from '@/components/Loader';
import { NextLocaleToLocale } from '@/utils/Locale';
import { ProductApi } from '@/api/product';
import type { ProductVariant } from '@shopify/hydrogen-react/storefront-api-types';
import { titleToHandle } from '@/utils/TitleToHandle';
import { usePathname } from 'next/navigation';
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
    display: flex;
    flex-direction: column;
`;
const DetailsBrand = styled.div`
    font-weight: 700;
    transition: 250ms ease-in-out;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--accent-primary);
        }
    }
`;
const DetailsTitle = styled.div`
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 500;
    transition: 250ms ease-in-out;
    word-wrap: break-word;
    hyphens: auto;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--accent-primary);
        }
    }

    @media (max-width: 950px) {
        font-size: 1.5rem;
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
    background: var(--color-bright);
    border-radius: var(--block-border-radius);
    border: 0.2rem solid #fefefe;
    cursor: pointer;
    transition: 250ms ease-in-out;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--accent-primary);
        }
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
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 700;
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
            gap: 0;

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
    min-height: 0;
    min-width: 0;
`;

const RemoveButton = styled.button`
    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--color-danger);
            color: var(--color-bright);
        }
    }
`;
const Quantity = styled.div<{ disabled?: boolean }>`
    height: 3rem;
    background: var(--color-bright);
    border-radius: var(--block-border-radius);
    color: var(--color-dark);
    transition: 250ms ease-in-out;

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
        border-radius: 0;
        font-size: 1.25rem;
        text-align: center;
        outline: none;
    }

    @media (hover: hover) and (pointer: fine) {
        button:hover {
            background: var(--accent-primary);
            color: var(--accent-primary-text);
        }
    }
`;
const QuantitySection = styled(Section)`
    grid-area: quantity;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    gap: var(--block-spacer);
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
    grid-template-columns: 8rem 1fr 8.5rem 14rem;
    grid-template-rows: 1fr;
    grid-template-areas: 'image meta price quantity';
    gap: var(--block-spacer-small);
    padding: var(--block-padding);
    background: var(--color-block);
    color: var(--color-dark);
    border-radius: var(--block-border-radius);

    @media (max-width: 950px) {
        grid-template-columns: 8rem 1fr 14rem;
        grid-template-areas:
            'image meta meta'
            'image price quantity';
    }
`;

interface CartItemProps {}
const CartItem: FunctionComponent<CartItemProps> = ({}) => {
    const route = usePathname();
    const locale = NextLocaleToLocale(route?.split('/').at(1) || Config.i18n.default); // FIXME: Handle this properly.
    const cart = useCart();
    const line = useCartLine();
    const TempImage = Image as any;

    const { data: product } = useSWR(
        [
            'ProductApi',
            {
                handle: line?.merchandise?.product?.handle!,
                locale: locale.locale
            }
        ],
        ([, props]) => ProductApi(props)
    );

    const [variant, setVariant] = useState<ProductVariant | null>(null);

    useEffect(() => {
        if (!product) return;

        setVariant(product?.variants.edges.find?.((edge) => edge.node.id === line.merchandise?.id)?.node || null);
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
                    <Link href={`/products/${product?.handle}/`} prefetch={false}>
                        <TempImage
                            src={
                                product.images.edges.find((edge) => edge.node.id === variant.image?.id)?.node.url || ''
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
                        <Link href={`/collections/${titleToHandle(product?.vendor)}/`} prefetch={false}>
                            {product?.vendor}
                        </Link>
                    </DetailsBrand>
                    <DetailsTitle>
                        <Link href={`/products/${product?.handle}/`} prefetch={false}>
                            {product?.title}
                        </Link>
                    </DetailsTitle>
                </Details>
            </MetaSection>

            {(variant.price?.amount && (
                <PriceSection>
                    <Price className={`${(discount > 0 && 'Sale') || ''}`}>
                        {discount > 0 && variant.compareAtPrice?.amount && (
                            <Money
                                data={{
                                    currencyCode: variant.price?.currencyCode!,
                                    ...(variant.compareAtPrice as any)
                                }}
                                className="Currency Currency-Sale"
                            />
                        )}
                        <Money data={variant.price} className={(discount > 0 && 'Currency Currency-Discount') || ''} />
                    </Price>
                </PriceSection>
            )) ||
                null}

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

                                            const quantity = Number.parseInt(event.currentTarget.value);
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

                <RemoveButton onClick={() => cart.linesRemove([line.id!])}>
                    <FiTrash />
                </RemoveButton>
            </QuantitySection>
        </Content>
    );
};

export default CartItem;

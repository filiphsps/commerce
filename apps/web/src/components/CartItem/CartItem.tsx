'use client';

import { CartLineQuantity, CartLineQuantityAdjustButton, Money, useCart, useCartLine } from '@shopify/hydrogen-react';
import { FiTrash } from 'react-icons/fi';
import styled, { css } from 'styled-components';

import styles from '@/components/CartItem/cart-item.module.scss';
import Link from '@/components/link';
import type { LocaleDictionary } from '@/utils/locale';
import { useTranslation, type Locale } from '@/utils/locale';
import { TitleToHandle } from '@/utils/title-to-handle';
import type { Product, ProductVariant } from '@shopify/hydrogen-react/storefront-api-types';
import Image from 'next/legacy/image';
import type { FunctionComponent } from 'react';

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
    transition: 150ms ease-in-out;

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
    transition: 150ms ease-in-out;
    word-wrap: break-word;
    hyphens: auto;
    -webkit-hyphens: auto;

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
    transition: 150ms ease-in-out;

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

    &.sale {
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

        &.sale {
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
    && {
        height: 4rem;
        font-size: 1.5rem;
    }

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
    transition: 150ms ease-in-out;

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
        font-weight: 500;
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
        height: 100%;
        min-width: 3rem;
        text-align: center;
        font-size: 2rem;
        font-weight: 600;
        line-height: 1;
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

interface CartItemProps {
    locale: Locale;
    i18n: LocaleDictionary;
}
const CartItem: FunctionComponent<CartItemProps> = ({ locale, i18n }) => {
    const { t } = useTranslation('common', i18n);

    const { linesRemove, linesUpdate, status } = useCart();
    const line = useCartLine();
    const TempImage = Image as any;

    const product: Required<Product> = line.merchandise?.product! as any;
    if (!product) {
        console.error(`Product not found for line ${line.id}`);
        return null;
    }
    const variant: Required<ProductVariant> = line.merchandise! as any;
    if (!variant) {
        console.error(`Product variant not found for line ${line.id}`);
        return null;
    }

    let discount =
        (variant.compareAtPrice?.amount &&
            Number.parseFloat(variant.compareAtPrice?.amount || '') - Number.parseFloat(variant.price.amount || '')) ||
        0;
    return (
        <Content className={`${styles.container} ${(discount > 0 && 'sale') || ''}`}>
            <ProductImage>
                <ImageWrapper>
                    <Link href={`/products/${product?.handle}/`} locale={locale}>
                        <TempImage
                            src={variant.image!.url || ''}
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
                        <Link href={`/collections/${TitleToHandle(product?.vendor)}/`}>{product.vendor}</Link>
                    </DetailsBrand>
                    <DetailsTitle>
                        <Link href={`/products/${product?.handle}/`}>{product.title}</Link>
                    </DetailsTitle>
                </Details>
            </MetaSection>

            {(variant.price?.amount && (
                <PriceSection>
                    <Price className={`${(discount > 0 && 'sale') || ''}`}>
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
                <Quantity disabled={status !== 'idle'}>
                    <CartLineQuantityAdjustButton
                        title="Decrease" // TODO: i18n.
                        adjust="decrease"
                    >
                        -
                    </CartLineQuantityAdjustButton>
                    <CartLineQuantity
                        as={
                            ((props: any) => {
                                return (
                                    <input
                                        type="number"
                                        min={1}
                                        max={999}
                                        step={1}
                                        pattern="[0-9]"
                                        placeholder={t('quantity')}
                                        disabled={status !== 'idle'}
                                        value={props.children}
                                        onInput={(event) => {
                                            event.currentTarget.value = event.currentTarget.value
                                                .replace(/[^0-9.]/g, '')
                                                .replace(/(\..*?)\..*/g, '$1');

                                            if (event.currentTarget.value === '') {
                                                linesRemove([line.id!]);
                                                return;
                                            }

                                            const quantity = Number.parseInt(event.currentTarget.value);
                                            if (quantity === line.quantity) return;

                                            linesUpdate([
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
                    <CartLineQuantityAdjustButton
                        title="Increase" // TODO: i18n.
                        adjust="increase"
                    >
                        +
                    </CartLineQuantityAdjustButton>
                </Quantity>

                <RemoveButton
                    title={`Remove "${product.vendor} ${product.title} - ${variant.title}" from the cart`} // TODO: i18n.
                    onClick={() => linesRemove([line.id!])}
                >
                    <FiTrash />
                </RemoveButton>
            </QuantitySection>
        </Content>
    );
};

export default CartItem;

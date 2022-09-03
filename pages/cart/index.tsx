import React, { FunctionComponent, useState } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import Button from '../../src/components/Button';
import CartItem from '../../src/components/CartItem';
import { CheckoutApi } from '../../src/api/checkout';
import { Config } from '../../src/util/Config';
import Currency from '../../src/components/Currency';
import LanguageString from '../../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import PageLoader from '../../src/components/PageLoader';
import PaymentProviders from '../../src/components/PaymentProviders';
import { StoreModel } from '../../src/models/StoreModel';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';
import { useEffect } from 'react';

const Content = styled.div`
    display: grid;
    grid-template-columns: 1fr 28rem;
    gap: 2rem;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
    }
`;
const ContentWrapper = styled.div``;

const FreeShippingBanner = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: calc(100vw - 3rem);
    margin-top: 2rem;
    padding: 1rem;
    border-radius: var(--block-border-radius);
    background: #efefef;
    font-size: 1.75rem;
    font-weight: 700;
    text-transform: uppercase;
`;
const FreeShippingBannerText = styled.div`
    opacity: 0.75;
    &.Full {
        opacity: 1;
        color: var(--accent-primary);
    }
`;
const ProgressBar = styled.div`
    height: 100%;
    background: var(--accent-secondary);
`;
const Progress = styled.div`
    overflow: hidden;
    width: 100%;
    height: 2rem;
    background: #fefefe;
    border-radius: var(--block-border-radius);

    &.Full {
        ${ProgressBar} {
            background: var(--accent-primary);
        }
    }
`;

const ItemsContainer = styled.table`
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0px 2rem;
    font-size: 1.25rem;
    margin-top: -2rem;
`;

const SummaryContainer = styled.div`
    position: relative;
    padding: 1rem;
    max-width: calc(100vw - 3rem);
    border-radius: var(--block-border-radius);
    background: #efefef;
`;
const SummaryContent = styled.div`
    position: sticky;
    top: 6rem;
`;
const SummaryItems = styled.div`
    padding-bottom: 1rem;
    text-transform: uppercase;
`;
const SummaryItem = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    padding-bottom: 1rem;
`;
const SummaryItemMeta = styled.div``;
const SummaryItemTitle = styled.div`
    font-size: 1.25rem;
    font-weight: 700;
    color: #404756;
`;
const SummaryItemVendor = styled.div`
    font-size: 1rem;
    text-transform: lowercase;
`;
const SummaryItemPrice = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    text-align: right;
    font-weight: 700;
    font-size: 1.25rem;

    .Currency-Sale {
        color: #d91e18;
    }
`;
const SummaryItemShipping = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
`;
const SummarySummary = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    padding: 0.5rem 0px 1rem 0px;
    text-transform: uppercase;
    border-top: 0.2rem solid #404756;
`;

const Header = styled.tr`
    text-transform: uppercase;
`;
const HeaderItem = styled.th`
    min-width: 6rem;
    padding-left: 1rem;
`;

interface CartPageProps {
    store: StoreModel;
}
const CartPage: FunctionComponent<CartPageProps> = (props: any) => {
    const { store } = props;
    const cart = useCart();
    const [loading, setLoading] = useState(false);

    const currency = 'USD';
    const price = cart.items.reduce(
        (previousValue, item) => previousValue + item.price * item.quantity,
        0
    );

    const freeShipping = cart.cartTotal > 75;

    useEffect(() => {
        (window as any).dataLayer.push({
            ecommerce: null
        });
        (window as any).dataLayer.push({
            event: 'view_cart',
            currency: 'USD',
            value: price,
            ecommerce: {
                items: cart.items.map((item) => ({
                    item_id: item.id,
                    item_name: item.title,
                    item_variant: item.variant_title,
                    item_brand: item.brand,
                    currency: 'USD',
                    quantity: item.quantity,
                    price: item.price
                }))
            }
        });
    }, []);

    return (
        <Page className="CartPage">
            <NextSeo title="Cart" />

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'cart'} />,
                            url: '/cart'
                        }
                    ]}
                    store={store}
                    hideSocial={true}
                />

                <PageHeader title="Cart" />

                <Content>
                    <ContentWrapper>
                        <ItemsContainer>
                            {cart.items?.length >= 1 ? (
                                <>
                                    <Header>
                                        <HeaderItem
                                            style={{ width: '6rem' }}
                                        ></HeaderItem>
                                        <HeaderItem>
                                            <LanguageString id={'product'} />
                                        </HeaderItem>
                                        <HeaderItem>
                                            <LanguageString id={'quantity'} />
                                        </HeaderItem>
                                        <HeaderItem>
                                            <LanguageString id={'price'} />
                                        </HeaderItem>
                                        <HeaderItem></HeaderItem>
                                    </Header>

                                    {cart.items?.map((item) => {
                                        return (
                                            <CartItem
                                                key={`${item.id}_${item.variant_id}`}
                                                data={item}
                                                total_items={cart.totalItems}
                                            />
                                        );
                                    })}
                                </>
                            ) : (
                                !cart.items && <PageLoader />
                            )}
                        </ItemsContainer>

                        <FreeShippingBanner>
                            <FreeShippingBannerText
                                className={freeShipping ? 'Full' : ''}
                            >
                                Free shipping on orders above $75
                            </FreeShippingBannerText>
                            <Progress className={freeShipping ? 'Full' : ''}>
                                <ProgressBar
                                    style={{
                                        width: `${(cart.cartTotal / 75) * 100}%`
                                    }}
                                />
                            </Progress>
                        </FreeShippingBanner>
                    </ContentWrapper>

                    <SummaryContainer>
                        <SummaryContent>
                            <div className="CartPage-Content-Total-Content">
                                <SummaryItems>
                                    {cart.items?.map((line_item) => {
                                        return (
                                            <SummaryItem key={line_item.id}>
                                                <SummaryItemMeta>
                                                    <SummaryItemTitle>
                                                        {line_item?.title}
                                                    </SummaryItemTitle>
                                                    <SummaryItemVendor>
                                                        {`${line_item?.quantity}x - ${line_item?.variant_title}`}
                                                    </SummaryItemVendor>
                                                </SummaryItemMeta>
                                                <SummaryItemPrice>
                                                    <Currency
                                                        price={
                                                            line_item?.itemTotal
                                                        }
                                                        currency={
                                                            line_item.currency
                                                        }
                                                    />
                                                </SummaryItemPrice>
                                            </SummaryItem>
                                        );
                                    })}
                                </SummaryItems>

                                <SummarySummary>
                                    <SummaryItemShipping>
                                        {!freeShipping ? (
                                            <LanguageString
                                                id={'excl_shipping'}
                                            />
                                        ) : (
                                            'Free shipping!'
                                        )}
                                    </SummaryItemShipping>
                                    <SummaryItemPrice>
                                        <Currency
                                            price={price}
                                            currency={currency}
                                            prefix={
                                                <>
                                                    <LanguageString
                                                        id={'total'}
                                                    />
                                                    :{' '}
                                                </>
                                            }
                                        />
                                    </SummaryItemPrice>
                                </SummarySummary>
                            </div>
                            <div>
                                <Button
                                    disabled={
                                        cart.items?.length <= 0 ||
                                        !cart.items ||
                                        loading
                                    }
                                    onClick={async () => {
                                        setLoading(true);

                                        try {
                                            const url = (
                                                (await CheckoutApi(
                                                    cart.items
                                                )) as string
                                            ).replace(
                                                Config.shopify.domain,
                                                'checkout.candybysweden.com'
                                            );

                                            (window as any).dataLayer.push({
                                                ecommerce: null
                                            });
                                            (window as any).dataLayer.push({
                                                event: 'begin_checkout',
                                                currency: 'USD',
                                                value: price,
                                                ecommerce: {
                                                    items: cart.items.map(
                                                        (item) => ({
                                                            item_id: item.id,
                                                            item_name:
                                                                item.title,
                                                            item_variant:
                                                                item.variant_title,
                                                            item_brand:
                                                                item.brand,
                                                            currency: 'USD',
                                                            quantity:
                                                                item.quantity,
                                                            price: item.price
                                                        })
                                                    )
                                                }
                                            });

                                            // Microsoft Ads tracking
                                            if ((window as any).uetq) {
                                                (window as any).uetq.push(
                                                    'event',
                                                    'begin_checkout',
                                                    {
                                                        ecomm_prodid:
                                                            cart.items.map(
                                                                (item) =>
                                                                    item.id
                                                                        .replaceAll(
                                                                            'gid://shopify/Product/',
                                                                            ''
                                                                        )
                                                                        .replaceAll(
                                                                            'gid://shopify/ProductVariant',
                                                                            ''
                                                                        )
                                                            ),
                                                        ecomm_pagetype: 'cart',
                                                        ecomm_totalvalue: price,
                                                        revenue_value: 1,
                                                        currency: 'USD',
                                                        items: cart.items.map(
                                                            (item) => ({
                                                                id: item.id,
                                                                quantity:
                                                                    item.quantity,
                                                                price: item.price
                                                            })
                                                        )
                                                    }
                                                );
                                            }

                                            window.location.href = url;
                                        } catch (err) {
                                            console.error(err);
                                            alert(err.message);
                                            setLoading(false);
                                        }
                                    }}
                                >
                                    <LanguageString
                                        id={
                                            (loading && 'loading...') ||
                                            'checkout'
                                        }
                                    />
                                </Button>
                                <PaymentProviders />
                            </div>
                        </SummaryContent>
                    </SummaryContainer>
                </Content>
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ locale }) {
    return {
        props: {},
        revalidate: 5
    };
}

export default CartPage;

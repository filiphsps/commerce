import React, { FunctionComponent, useRef, useState } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import Button from '../../src/components/Button';
import CartItem from '../../src/components/CartItem';
import { CheckoutApi } from '../../src/api/checkout';
import CollectionBlock from '../../src/components/CollectionBlock';
import { Config } from '../../src/util/Config';
import ContentBlock from '../../src/components/ContentBlock';
import Currency from '../../src/components/Currency';
import LanguageString from '../../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import PageLoader from '../../src/components/PageLoader';
import { RecommendationApi } from '../../src/api/recommendation';
import { StoreModel } from '../../src/models/StoreModel';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

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
    max-width: calc(100vw - 2rem);
    margin-top: 2rem;
    padding: 1rem;
    border-radius: var(--block-border-radius);
    background: #efefef;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
`;
const FreeShippingBannerText = styled.div`
    display: flex;
    gap: 0.5rem;
    opacity: 0.75;
    &.Full {
        opacity: 1;
        color: var(--accent-primary);
    }
`;
const FreeShippingBannerMeta = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    justify-content: center;
    align-items: center;
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

const ItemsContainerWrapper = styled.div`
    background: #efefef;
    border-radius: var(--block-border-radius);
    padding: 0px 1rem;
`;
const ItemsContainer = styled.table`
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0px 1rem;
    font-size: 1.25rem;
    table-layout: fixed;
`;

const SummaryContent = styled.div`
    position: sticky;
    top: 8rem;
    padding: 1rem;
    border-radius: var(--block-border-radius);
    background: #efefef;
    transition: 250ms ease-in-out;
`;
const SummaryItems = styled.div`
    padding-bottom: 1rem;
    text-transform: uppercase;

    @media (max-width: 950px) {
        display: none;
    }
`;
const SummaryContainer = styled.div`
    position: relative;
    max-width: calc(100vw - 2rem);

    @media (max-width: 950px) {
        overflow: hidden;
        position: sticky;
        bottom: 0px;
        transition: 250ms ease-in-out;

        &.Floating {
            width: 100vw;
            max-width: 100vw;
            margin: 0px -1.5rem 0px -1.5rem;
            left: 0px;
            right: 0px;
            border-top: 0.2rem solid #e9e9e9;
            box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);

            ${SummaryContent} {
                padding: 2rem;
                padding-right: 8rem;
                border-radius: 0px;
            }
        }
    }
`;
const SummaryItem = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    padding-bottom: 1rem;
`;
const SummaryItemMeta = styled.div``;
const SummaryItemTitle = styled.div`
    font-size: 1.5rem;
    font-weight: 700;
    color: #404756;
`;
const SummaryItemVendor = styled.div`
    padding-top: 0.25rem;
    font-size: 1.25rem;
    font-weight: 700;
    opacity: 0.75;
    text-transform: lowercase;
    letter-spacing: 0.05rem;
`;
const SummaryItemPrice = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    text-align: right;
    font-weight: 700;
    font-size: 1.75rem;

    .Currency-Sale {
        color: #d91e18;
    }
`;
const SummaryItemShipping = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    font-size: 1.25rem;
`;
const SummarySummary = styled.div`
    display: grid;
    justify-content: space-between;
    align-items: flex-end;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    padding: 0.5rem 0px 1rem 0px;
    text-transform: uppercase;
    border-top: 0.2rem solid #404756;

    @media (max-width: 950px) {
        border-top: none;
        padding-top: 0px;
    }

    &.Empty {
        border-top: none;
        margin-top: -1rem;
    }
`;

const Header = styled.tr`
    text-transform: uppercase;
`;
const HeaderItem = styled.th`
    min-width: 6rem;
    padding-left: 1rem;
    font-weight: 700;
    opacity: 0.75;

    @media (max-width: 950px) {
        font-size: 1rem;
    }
`;
const HeaderItemImage = styled(HeaderItem)`
    display: block;
    width: 6rem;
    max-width: 6rem;
    padding-left: 0px;
    @media (max-width: 950px) {
        width: 2rem;
        max-width: 2rem;
    }
`;

const Recommendations = styled(ContentBlock)`
    display: block;
    grid-template-rows: auto auto;
    max-width: calc(100vw - 2rem);
    padding: 1rem;
    margin-top: 2rem;
    border-radius: var(--block-border-radius);
`;
const RecommendationsTitle = styled.h3`
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 700;
    opacity: 0.75;
`;
const RecommendationsWrapper = styled.div`
    position: relative;
    display: grid;
    grid-auto-flow: row;
    grid-auto-rows: 100%;
    grid-template-columns: unset;
    grid-template-rows: unset;
`;
const RecommendationsContent = styled.div`
    overflow-y: auto;
    display: grid;
    width: 100%;

    @media (max-width: 1148px) {
        grid-template-columns: 1fr 1fr 1fr;
    }

    @media (max-width: 950px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (max-width: $width-max-mobile) {
        grid-template-columns: 1fr;
        margin: 2rem 0px 0px 0px;
    }
`;

interface CartPageProps {
    store: StoreModel;
}
const CartPage: FunctionComponent<CartPageProps> = (props: any) => {
    const { store } = props;
    const cart = useCart();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>({
        totalItems: 0,
        items: []
    });
    const router = useRouter();

    // SSR workaround
    useEffect(() => {
        if (data.totalItems === cart.totalItems) return;

        setData(cart);
    }, [cart.totalItems]);

    // Sticky summary
    const [isSticky, setIsSticky] = useState(false);
    const summaryRef = useRef();
    useEffect(() => {
        const cachedRef = summaryRef.current,
            observer = new IntersectionObserver(
                ([e]) => setIsSticky(!(e.intersectionRatio < 1)),
                {
                    threshold: [1],
                    rootMargin: '0px 0px -1px 0px'
                }
            );

        observer.observe(cachedRef);

        // unmount
        return function () {
            observer.unobserve(cachedRef);
        };
    }, []);

    const { data: recommendations } = useSWR(['recommendations'], () =>
        RecommendationApi({
            id:
                data.totalItems > 0
                    ? cart.items[0].id.split('#')[0]
                    : '7325668311194',
            locale: router?.locale
        })
    ) as any;

    const currency = 'USD';
    const price = data.items.reduce(
        (previousValue, item) => previousValue + item.price * item.quantity,
        0
    );

    const freeShipping = data.cartTotal > 75;

    useEffect(() => {
        (window as any).dataLayer?.push({
            ecommerce: null
        });
        (window as any).dataLayer?.push({
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
                        <ItemsContainerWrapper>
                            <ItemsContainer>
                                {data.items?.length >= 1 ? (
                                    <>
                                        <thead>
                                            <Header>
                                                <HeaderItemImage>
                                                    <LanguageString
                                                        id={'product'}
                                                    />
                                                </HeaderItemImage>
                                                <HeaderItem></HeaderItem>
                                                <HeaderItem>
                                                    <LanguageString
                                                        id={'quantity'}
                                                    />
                                                </HeaderItem>
                                                <HeaderItem>
                                                    <LanguageString
                                                        id={'price'}
                                                    />
                                                </HeaderItem>
                                                <HeaderItem
                                                    style={{
                                                        width: '2rem'
                                                    }}
                                                ></HeaderItem>
                                            </Header>
                                        </thead>
                                        <tbody>
                                            {data.items?.map((item) => {
                                                return (
                                                    <CartItem
                                                        key={`${item.id}_${item.variant_id}`}
                                                        data={item}
                                                        total_items={
                                                            data.totalItems
                                                        }
                                                    />
                                                );
                                            })}
                                        </tbody>
                                    </>
                                ) : (
                                    !data.items && <PageLoader />
                                )}
                            </ItemsContainer>
                        </ItemsContainerWrapper>

                        <FreeShippingBanner>
                            <FreeShippingBannerMeta>
                                <FreeShippingBannerText
                                    className={freeShipping ? 'Full' : ''}
                                >
                                    Free shipping on orders above $75
                                </FreeShippingBannerText>
                                <FreeShippingBannerText>
                                    <Currency
                                        price={data.cartTotal}
                                        currency="USD"
                                    />
                                    {`/`}
                                    <Currency price={75} currency="USD" />
                                </FreeShippingBannerText>
                            </FreeShippingBannerMeta>
                            <Progress className={freeShipping ? 'Full' : ''}>
                                <ProgressBar
                                    style={{
                                        width: `${
                                            freeShipping
                                                ? 100
                                                : (data.cartTotal / 75) * 100
                                        }%`
                                    }}
                                />
                            </Progress>
                        </FreeShippingBanner>

                        {recommendations?.length > 1 ? (
                            <Recommendations dark>
                                <RecommendationsTitle>
                                    Recommended Products
                                </RecommendationsTitle>
                                <RecommendationsWrapper>
                                    <RecommendationsContent>
                                        <CollectionBlock
                                            data={{
                                                items: recommendations
                                            }}
                                            isHorizontal
                                        />
                                    </RecommendationsContent>
                                </RecommendationsWrapper>
                            </Recommendations>
                        ) : (
                            <PageLoader />
                        )}
                    </ContentWrapper>

                    <SummaryContainer
                        ref={summaryRef}
                        className={isSticky ? 'Sticky' : 'Floating'}
                    >
                        <SummaryContent>
                            <div className="CartPage-Content-Total-Content">
                                <SummaryItems>
                                    {data.items?.map((line_item) => {
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

                                <SummarySummary
                                    className={
                                        data.totalItems <= 0 ? 'Empty' : ''
                                    }
                                >
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
                                        data.items?.length <= 0 ||
                                        !data.items ||
                                        loading
                                    }
                                    onClick={async () => {
                                        setLoading(true);

                                        try {
                                            const url = (
                                                (await CheckoutApi(
                                                    data.items
                                                )) as string
                                            ).replace(
                                                Config.shopify.domain,
                                                'checkout.candybysweden.com'
                                            );

                                            (window as any).dataLayer?.push({
                                                ecommerce: null
                                            });
                                            (window as any).dataLayer?.push({
                                                event: 'begin_checkout',
                                                currency: 'USD',
                                                value: price,
                                                ecommerce: {
                                                    items: data.items.map(
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
                                                            data.items.map(
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
                                                        items: data.items.map(
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
                                            'begin_checkout'
                                        }
                                    />
                                </Button>
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

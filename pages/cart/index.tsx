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
import { useWindowSize } from 'rooks';

const Content = styled.div`
    display: grid;
    grid-template-columns: auto 28rem;
    gap: 2rem;
    max-width: 100%;

    @media (min-width: 950px) {
        position: relative;
        overflow: hidden;
    }

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
`;
const ContentWrapper = styled.div`
    display: block;
    overflow: hidden;
    width: 100;
`;

const FreeShippingBanner = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: calc(100vw - 3rem);
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
    overflow: hidden;
    max-width: 100%;
    padding: 0px 1rem;
    background: #efefef;
    border-radius: var(--block-border-radius);

    // TODO: Remove padding on mobile.
`;
const ItemsContainer = styled.table`
    display: block;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0px 1rem;
    font-size: 1.25rem;
    table-layout: fixed;
    overflow: hidden;

    tbody,
    thead {
        display: block;
        width: 100%;
    }
`;

const SummaryContent = styled.div`
    position: sticky;
    top: 0rem;
    padding: 1rem;
    border-radius: var(--block-border-radius);
    background: #efefef;
    transition: 150ms ease-in-out;

    @media (max-width: 950px) {
        Button {
            height: 4.5rem;
            padding: 1rem 1.5rem;
            font-size: 1.5rem;
        }
    }
`;
const SummaryItems = styled.div`
    padding-bottom: 1rem;
    text-transform: uppercase;

    @media (max-width: 950px) {
        display: none;
    }
`;
const SummaryContainer = styled.div`
    z-index: 1;
    position: sticky;

    @media (max-width: 950px) {
        max-width: calc(100vw - 3rem);
        position: sticky;
        bottom: 0px;
        transition: 150ms ease-in-out;

        &.Floating {
            width: 100vw;
            max-width: 100vw;
            margin: 0px -1.5rem 0px -1.5rem;
            left: 0px;
            right: 0px;
            border-top: 0.2rem solid #e9e9e9;
            box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);

            background: var(--accent-secondary-light);

            ${SummaryContent} {
                padding: 1.5rem;
                padding-right: 10rem;
                border-radius: 0px;
            }
        }
    }
`;
const SummaryItem = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    margin-bottom: 1.5rem;
`;
const SummaryItemMeta = styled.div``;
const SummaryItemTitle = styled.div`
    font-size: 1.25rem;
    font-weight: 700;
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
    font-size: 1.25rem;

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
    padding: 0.5rem 0px 0.5rem 0px;
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
    display: grid;
    width: 100%;
    grid-template-columns: 8rem 1fr 4rem 12rem 6rem;
    grid-template-rows: 1fr;
    grid-gap: 1rem;
    padding: 1rem 0px 0.5rem 0px;
    text-transform: uppercase;

    @media (max-width: 950px) {
        grid-gap: 0.5rem;
        grid-template-columns: 8rem 1fr 4rem 7rem;
        padding: 1rem 0px 0.5rem 0px;
    }
`;
const HeaderItem = styled.th`
    display: block;
    font-weight: 700;
    opacity: 0.75;
    text-align: left;

    @media (max-width: 950px) {
        font-size: 1rem;
        text-align: left;
    }
`;
const HeaderItemImage = styled(HeaderItem)``;
const HeaderItemQuantity = styled(HeaderItem)`
    opacity: 0;

    @media (min-width: 950px) {
        opacity: 0.75;
        text-align: center;
        transform: translateX(-25%);
    }
`;
const HeaderItemPrice = styled(HeaderItem)`
    @media (min-width: 950px) {
        text-align: center;
    }
`;
const HeaderItemActions = styled(HeaderItem)`
    @media (max-width: 950px) {
        display: none;
    }
`;

const Recommendations = styled(ContentBlock)`
    display: block;
    width: 100%;
    margin-top: 2rem;
    border-radius: var(--block-border-radius);
`;
const RecommendationsTitle = styled.h3`
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 700;
    opacity: 0.75;
`;
const RecommendationsContent = styled(PageContent)`
    width: 100%;

    @media (max-width: 950px) {
        width: calc(100vw - 3rem);
        max-width: calc(100vw - 3rem);
        padding: 0px;
    }
`;

export const Checkout = async ({
    data,
    price,
    currency = 'USD',
    locale = Config.i18n.locales[0]
}: {
    data: any;
    price: number;
    currency?: string;
    locale?: string;
}) => {
    const url = (
        (await CheckoutApi({
            items: data.items,
            locale
        })) as string
    ).replace(Config.shopify.domain, 'checkout.sweetsideofsweden.com');

    // Google Tracking
    (window as any).dataLayer?.push({
        ecommerce: null
    });
    (window as any).dataLayer?.push({
        event: 'begin_checkout',
        currency: currency,
        value: price,
        ecommerce: {
            items: data.items.map((item) => ({
                item_id: item.id,
                item_name: item.title,
                item_variant: item.variant_title,
                item_brand: item.brand,
                currency: currency,
                quantity: item.quantity,
                price: item.price
            }))
        }
    });

    // Microsoft Ads tracking
    if ((window as any).uetq) {
        (window as any).uetq.push('event', 'begin_checkout', {
            ecomm_prodid: data.items.map((item) =>
                item.id
                    .replaceAll('gid://shopify/Product/', '')
                    .replaceAll('gid://shopify/ProductVariant', '')
            ),
            ecomm_pagetype: 'cart',
            ecomm_totalvalue: price,
            revenue_value: 1,
            currency: currency,
            items: data.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price
            }))
        });
    }

    // Do it this way to handle cross-domain tracking.
    let link = document.createElement('a');
    link.setAttribute('type', 'hidden');
    link.setAttribute('href', url);
    document.body.appendChild(link);
    link.click();
};

interface CartPageProps {
    store: StoreModel;
}
const CartPage: FunctionComponent<CartPageProps> = (props: any) => {
    const { store } = props;
    const { outerWidth } = useWindowSize();
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
    const summaryRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const cachedRef = summaryRef.current,
            observer = new IntersectionObserver(
                ([e]) => setIsSticky(!(e.intersectionRatio < 1)),
                {
                    threshold: [1],
                    rootMargin: '0px 0px -1px 0px'
                }
            );

        observer.observe(cachedRef!);

        // unmount
        return () => {
            observer.unobserve(cachedRef!);
        };
    }, []);

    const { data: recommendations } = useSWR(['recommendations'], () =>
        RecommendationApi({
            id:
                data.totalItems > 0
                    ? cart.items[0].id.split('#')[0]
                    : '8463374614833',
            locale: router?.locale
        })
    ) as any;

    const currency = 'USD'; // FIXME
    const price = data.items.reduce(
        (previousValue, item) => previousValue + item.price * item.quantity,
        0
    );

    const freeShipping = (Number.parseFloat(data.cartTotal) || 0) > 75;

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
            <NextSeo title="Cart" canonical={`https://${Config.domain}/cart`} />

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
                                                <HeaderItemQuantity>
                                                    <LanguageString
                                                        id={'quantity'}
                                                    />
                                                </HeaderItemQuantity>
                                                <HeaderItemPrice>
                                                    <LanguageString
                                                        id={'price'}
                                                    />
                                                </HeaderItemPrice>
                                                <HeaderItemActions>
                                                    <LanguageString
                                                        id={'actions'}
                                                    />
                                                </HeaderItemActions>
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
                                                        store={store}
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
                                    <Currency
                                        prefix={'Free shipping on orders above'}
                                        price={75}
                                        currency="USD"
                                        store={store}
                                    />
                                </FreeShippingBannerText>
                                <FreeShippingBannerText>
                                    <Currency
                                        price={
                                            Number.parseFloat(data.cartTotal) ||
                                            0
                                        }
                                        currency="USD"
                                        store={store}
                                    />
                                    {`/`}
                                    <Currency
                                        price={75}
                                        currency="USD"
                                        store={store}
                                    />
                                </FreeShippingBannerText>
                            </FreeShippingBannerMeta>
                            <Progress className={freeShipping ? 'Full' : ''}>
                                <ProgressBar
                                    style={{
                                        width: `${
                                            freeShipping
                                                ? 100
                                                : ((Number.parseFloat(
                                                      data.cartTotal
                                                  ) || 0) /
                                                      75) *
                                                  100
                                        }%`
                                    }}
                                />
                            </Progress>
                        </FreeShippingBanner>
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
                                                        price={Number.parseFloat(
                                                            line_item?.itemTotal
                                                        )}
                                                        currency={
                                                            line_item.currency
                                                        }
                                                        store={store}
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
                                            price={Number.parseFloat(price)}
                                            currency={currency}
                                            prefix={
                                                <>
                                                    <LanguageString
                                                        id={'total'}
                                                    />
                                                    :{' '}
                                                </>
                                            }
                                            store={store}
                                        />
                                    </SummaryItemPrice>
                                </SummarySummary>
                            </div>
                            <div>
                                <Button
                                    className={
                                        outerWidth && outerWidth <= 950
                                            ? 'Secondary'
                                            : ''
                                    }
                                    disabled={
                                        data.items?.length <= 0 ||
                                        !data.items ||
                                        loading
                                    }
                                    onClick={async () => {
                                        setLoading(true);

                                        try {
                                            await Checkout({
                                                data,
                                                price,
                                                locale: router.locale
                                            });
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

                {cart.totalItems > 0 && (
                    <>
                        {recommendations?.length > 1 ? (
                            <Recommendations>
                                <RecommendationsTitle>
                                    Recommended Products
                                </RecommendationsTitle>
                                <RecommendationsContent>
                                    <CollectionBlock
                                        data={{
                                            items: recommendations
                                        }}
                                        isHorizontal
                                        store={store}
                                    />
                                </RecommendationsContent>
                            </Recommendations>
                        ) : (
                            <PageLoader />
                        )}
                    </>
                )}
            </PageContent>
        </Page>
    );
};

export default CartPage;

import * as Sentry from '@sentry/nextjs';

import {
    AnalyticsPageType,
    CartLineProvider,
    CartWithActions,
    useCart
} from '@shopify/hydrogen-react';
import { CartLine, Collection } from '@shopify/hydrogen-react/storefront-api-types';
import React, { FunctionComponent, useState } from 'react';
import styled, { css } from 'styled-components';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import Button from '../../src/components/Button';
import CartItem from '../../src/components/CartItem';
import CollectionBlock from '../../src/components/CollectionBlock';
import { Config } from '../../src/util/Config';
import ContentBlock from '../../src/components/ContentBlock';
import Currency from '../../src/components/Currency';
import { FiShoppingCart } from 'react-icons/fi';
import LanguageString from '../../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import PageLoader from '../../src/components/PageLoader';
import { RecommendationApi } from '../../src/api/recommendation';
import { StoreModel } from '../../src/models/StoreModel';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Content = styled.div`
    display: grid;
    grid-template-columns: 1fr minmax(auto, 28rem);
    gap: 1rem;
    max-width: 100%;
    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
`;
const ContentWrapper = styled.div`
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100;
`;

const FreeShippingBanner = styled.div<{ active?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    font-size: 1.5rem;
    font-weight: 800;

    ${({ active }) =>
        active &&
        css`
            background: var(--color-success);
            background: linear-gradient(
                320deg,
                var(--color-success-light) 0%,
                var(--color-success) 100%
            );
            color: var(--color-text-primary);

            .Currency {
                color: var(--accent-secondary);
            }
        `}
`;
const FreeShippingBannerText = styled.div`
    display: flex;
    gap: 0.25rem;
    font-size: 2.5rem;
    line-height: 2.75rem;
    font-weight: 700;
`;
const FreeShippingBannerTitle = styled.div`
    width: 100%;
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 500;

    .Currency {
        padding-left: 0.25rem;
    }
`;
const FreeShippingBannerMeta = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    justify-content: center;
    align-items: center;

    .Currency {
        display: inline;
        font-weight: 900;

        .Currency-Prefix,
        .Currency-Suffix {
            font-weight: 600;
            color: initial;
        }
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
    background: var(--color-text-primary);
    border-radius: var(--block-border-radius);

    &.Full {
        display: none;
    }
`;

const ItemsContainerWrapper = styled.div`
    max-width: 100%;
`;
const ItemsContainer = styled.table`
    display: block;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0px 1rem;
    font-size: 1.25rem;
    table-layout: fixed;

    tbody,
    thead {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 100%;
    }

    @media (min-width: 1465px) {
        border-spacing: 0px;
        table-layout: auto;
        border-collapse: collapse;

        tbody {
            max-width: 100%;

            display: grid;
            grid-template-columns: calc(50% - 0.5rem) calc(50% - 0.5rem);
            gap: 1rem;
        }
    }
`;

const Sidebar = styled.section`
    position: sticky;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: var(--color-text-dark);

    @media (min-width: 950px) {
        top: 10rem;
    }
`;
const SummaryContent = styled.div`
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    transition: 250ms ease-in-out;

    .CheckoutButton {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);
    }

    @media (max-width: 950px) {
        padding: 1rem;

        Button {
            height: 4.5rem;
            padding: 1rem 1rem;
            font-size: 1.5rem;
        }
    }
`;
const SummaryItemPrice = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: end;
    width: 100%;
    gap: 1px;
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 500;

    .Total {
        font-size: 2.5rem;
        line-height: 2.75rem;
        font-weight: 700;

        span {
            font-size: 1.25rem;
        }
    }

    .Currency-Sale {
        color: #d91e18;
    }
`;
const SummaryItemShipping = styled.div`
    font-size: 1.25rem;
    line-height: 1.5rem;
    font-weight: 700;
    width: 100%;
`;
const SummarySummary = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    padding-bottom: 1rem;

    @media (max-width: 950px) {
        border-top: none;
        padding-top: 0px;
    }

    &.Empty {
        border-top: none;
    }
`;
const SummaryContainer = styled.div`
    z-index: 5;

    @media (max-width: 950px) {
        /*max-width: calc(100vw - 2rem);
        max-width: calc(100dvw - 2rem);
        position: sticky;
        bottom: -1px;*/
        transition: 250ms ease-in-out;

        &.Floating {
            z-index: 9999999;
            width: 100vw;
            max-width: 100vw;
            margin: 0px -1rem 0px -1rem;
            left: 0px;
            right: 0px;
            box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);

            ${SummaryContent} {
                padding: 2rem 1rem 1rem;
                padding-right: 10rem;
                border-radius: 0px;

                background: var(--accent-secondary-light);
            }

            ${SummarySummary} {
                background: var(--color-text-primary);
                color: var(--accent-primary);
                padding: 1.25rem 1rem;
                border-radius: var(--block-border-radius);
                margin-bottom: 1rem;
            }
        }
    }
`;

const Recommendations = styled(ContentBlock)`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;
const RecommendationsTitle = styled.h3`
    display: block;
    padding: var(--block-padding-large);
    background: var(--accent-primary);
    background: linear-gradient(320deg, var(--accent-primary) 0%, var(--accent-primary-dark) 100%);
    border-radius: var(--block-border-radius);
    color: var(--color-text-primary);

    font-size: 2.25rem;
    line-height: 2.5rem;
    font-weight: 700;

    @media (max-width: 950px) {
        font-size: 2.25rem;
        font-weight: 700;
    }
`;
const RecommendationsContentWrapper = styled.div`
    display: block;
    padding: var(--block-padding-large);
    background: var(--accent-primary-dark);
    background: linear-gradient(
        320deg,
        var(--accent-secondary) 0%,
        var(--accent-primary-dark) 100%
    );
    border-radius: var(--block-border-radius);
    color: var(--color-text-primary);
`;
const RecommendationsContent = styled(PageContent)`
    width: 100%;

    @media (max-width: 950px) {
        width: calc(100vw - 2rem);
        max-width: calc(100vw - 2rem);
        padding: 0px;
    }
`;

// Const hacky workaround for ga4 cross-domain
// Ugly hack taken from StackOverflow
const getCrossDomainLinkerParameter = () => {
    // create form element, give it an action, make it hidden and prevent the submit event
    const formNode = document.createElement('form') as any;
    formNode.action = 'https://opensource.sweetsideofsweden.com';
    formNode.style.opacity = '0';
    formNode.addEventListener('submit', (event) => {
        event.preventDefault();
    });

    // create a button node, make it type=submit and append it to the form
    const buttonNode = document.createElement('button') as any;
    buttonNode.type = 'submit';
    formNode.append(buttonNode);

    // append the form (and button) to the DOM
    document.body.append(formNode);

    // trigger a click on the button node to submit the form
    buttonNode.click();

    // check for the input[name=_gl] hidden input in the form (if decoration worked)
    const _glNode = formNode.querySelector('input[name="_gl"]') as any;

    if (_glNode) return _glNode.value as string;
    return null;
};

export const Checkout = async ({ cart }: { cart: CartWithActions; locale?: string }) => {
    if (!cart.totalQuantity || cart.totalQuantity <= 0 || !cart.lines)
        throw new Error('Cart is empty!');
    else if (!cart.checkoutUrl) throw new Error('Cart is missing checkoutUrl');

    const url = cart.checkoutUrl.replace(Config.shopify.domain, Config.shopify.checkout_domain);

    try {
        // Google Tracking
        (window as any).dataLayer?.push(
            {
                ecommerce: null
            },
            {
                event: 'begin_checkout',
                currency: cart.cost?.totalAmount?.currencyCode!,
                value: Number.parseFloat(cart.cost?.totalAmount?.amount! || '0'),
                ecommerce: {
                    items: cart.lines.map((line: CartLine) => ({
                        item_id: line.merchandise.id,
                        item_name: line.merchandise.product.title,
                        item_variant: line.merchandise.title,
                        item_brand: line.merchandise.product.vendor,
                        currency: line.merchandise.price.currencyCode!,
                        quantity: line.quantity,
                        discount:
                            Number.parseFloat(line.merchandise.price?.amount! || '0') -
                            Number.parseFloat(line.cost.amountPerQuantity?.amount! || '0'),
                        price: Number.parseFloat(line.merchandise.price?.amount! || '0')
                    }))
                }
            }
        );

        // Microsoft Ads tracking
        if ((window as any).uetq) {
            (window as any).uetq.push('event', 'begin_checkout', {
                ecomm_prodid: cart.lines.map((line: CartLine) => line.merchandise.id),
                ecomm_pagetype: 'cart',
                ecomm_totalvalue: Number.parseFloat(cart.cost?.totalAmount?.amount! || '0'),
                revenue_value: Number.parseFloat(cart.cost?.totalAmount?.amount! || '0'),
                currency: cart.cost?.totalAmount?.currencyCode!,
                items: cart.lines.map((line: CartLine) => ({
                    id: line.merchandise.id,
                    quantity: line.quantity,
                    price: Number.parseFloat(line.merchandise.price.amount! || '0')
                }))
            });
        }
    } catch {}

    const ga4 = getCrossDomainLinkerParameter();
    const finalUrl = `${url}${(ga4 && `${(url.includes('?') && '&') || '?'}_gl=${ga4}`) || ''}`;
    window.location.href = finalUrl;
};

interface CartPageProps {
    store: StoreModel;
}
const CartPage: FunctionComponent<CartPageProps> = (props: any) => {
    const { store } = props;
    const cart = useCart();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const { data: recommendations } = useSWR(
        [
            (cart.totalQuantity &&
                cart.totalQuantity > 0 &&
                cart.lines?.[0]?.merchandise?.product?.id) ||
                '8452878893361'
        ],
        () =>
            RecommendationApi({
                id:
                    (cart.totalQuantity &&
                        cart.totalQuantity > 0 &&
                        cart.lines?.[0]?.merchandise?.product?.id) ||
                    '8452878893361', // FIXME: don't hardcode this
                locale: router?.locale
            })
    );

    const freeShipping = Number.parseFloat(cart.cost?.totalAmount?.amount || '0') > 75;

    useEffect(() => {
        if (!cart?.lines) return;

        (window as any).dataLayer?.push(
            {
                ecommerce: null
            },
            {
                event: 'view_cart',
                currency: 'USD',
                value: Number.parseFloat(cart.cost?.totalAmount?.amount || '0'),
                ecommerce: {
                    items: cart.lines.map((item: CartLine) => ({
                        item_id: item.merchandise.id,
                        item_name: item.merchandise.product.title,
                        item_variant: item.merchandise.title,
                        item_brand: item.merchandise.product.vendor,
                        currency: item.merchandise.price.currencyCode,
                        quantity: item.quantity,
                        price: Number.parseFloat(item.merchandise.price?.amount! || '0')
                    }))
                }
            }
        );
    }, [cart]);

    return (
        <Page className="CartPage">
            <NextSeo
                title="Cart"
                canonical={`https://${Config.domain}/${router.locale}/cart/`}
                languageAlternates={
                    router?.locales
                        ?.filter((locale) => locale !== 'x-default')
                        .map((locale) => ({
                            hrefLang: locale,
                            href: `https://${Config.domain}/${locale}/cart/`
                        })) || []
                }
            />

            <PageContent primary>
                <PageHeader
                    title="Cart"
                    subtitle="Manage your shopping bag here and begin the checkout process when you're ready!"
                />

                <Content>
                    <ContentWrapper>
                        <ItemsContainerWrapper>
                            <ItemsContainer>
                                {cart.lines && cart.lines.length >= 1 ? (
                                    <>
                                        <tbody>
                                            {cart.lines?.map((item: CartLine) => {
                                                return (
                                                    <CartLineProvider key={item.id} line={item}>
                                                        <CartItem store={store} />
                                                    </CartLineProvider>
                                                );
                                            })}
                                        </tbody>
                                    </>
                                ) : (
                                    !cart.lines && <PageLoader />
                                )}
                            </ItemsContainer>
                        </ItemsContainerWrapper>

                        {(cart?.totalQuantity || 0) > 0 && (
                            <>
                                {(recommendations?.length && recommendations.length > 1 && (
                                    <>
                                        <Recommendations>
                                            <RecommendationsTitle>
                                                Customers like you also bought
                                            </RecommendationsTitle>
                                            <RecommendationsContentWrapper>
                                                <RecommendationsContent>
                                                    <CollectionBlock
                                                        data={
                                                            {
                                                                // FIXME: this is hacky
                                                                products: {
                                                                    edges: recommendations.map(
                                                                        (product) => ({
                                                                            node: product
                                                                        })
                                                                    )
                                                                }
                                                            } as Collection
                                                        }
                                                        isHorizontal
                                                        store={store}
                                                    />
                                                </RecommendationsContent>
                                            </RecommendationsContentWrapper>
                                        </Recommendations>
                                    </>
                                )) || <PageLoader />}
                            </>
                        )}
                    </ContentWrapper>

                    <SummaryContainer>
                        <Sidebar>
                            <SummaryContent>
                                <div className="CartPage-Content-Total-Content">
                                    <SummarySummary
                                        className={
                                            !cart?.totalQuantity || cart.totalQuantity <= 0
                                                ? 'Empty'
                                                : ''
                                        }
                                    >
                                        <SummaryItemPrice>
                                            Subtotal
                                            <Currency
                                                className="Total"
                                                price={Number.parseFloat(
                                                    cart.cost?.totalAmount?.amount || '0'
                                                )}
                                                currency={
                                                    cart.cost?.totalAmount?.currencyCode ||
                                                    Config.i18n.currencies[0]
                                                }
                                                store={store}
                                            />
                                        </SummaryItemPrice>
                                        {!freeShipping && (
                                            <SummaryItemShipping>
                                                Shipping calculated at checkout
                                            </SummaryItemShipping>
                                        )}
                                    </SummarySummary>
                                </div>

                                <div>
                                    <Button
                                        className={'CheckoutButton'}
                                        disabled={
                                            (cart?.totalQuantity || 0) <= 0 ||
                                            !cart.lines ||
                                            loading ||
                                            (cart.status !== 'idle' &&
                                                cart.status !== 'uninitialized')
                                        }
                                        onClick={async () => {
                                            if (
                                                cart.status !== 'idle' &&
                                                cart.status !== 'uninitialized'
                                            )
                                                return;
                                            setLoading(true);

                                            try {
                                                await Checkout({
                                                    cart
                                                });
                                            } catch (error) {
                                                Sentry.captureException(error);
                                                alert(error.message);
                                                setLoading(false);
                                            }
                                        }}
                                    >
                                        <FiShoppingCart
                                            style={{
                                                marginRight: '1rem',
                                                width: '2rem',
                                                height: '1.75rem',
                                                fontSize: '1.25rem'
                                            }}
                                        />
                                        <LanguageString
                                            id={(loading && 'loading...') || 'begin_checkout'}
                                        />
                                    </Button>
                                </div>
                            </SummaryContent>

                            <FreeShippingBanner active={freeShipping}>
                                <FreeShippingBannerMeta>
                                    {(!freeShipping && (
                                        <FreeShippingBannerTitle>
                                            Add a few more items to get FREE shipping on this order!
                                        </FreeShippingBannerTitle>
                                    )) || (
                                        <FreeShippingBannerTitle>
                                            FREE shipping on this order!
                                        </FreeShippingBannerTitle>
                                    )}
                                    <FreeShippingBannerText>
                                        <Currency
                                            price={Number.parseFloat(
                                                cart.cost?.totalAmount?.amount || '0'
                                            )}
                                            currency={
                                                cart.cost?.totalAmount?.currencyCode ||
                                                Config.i18n.currencies[0]
                                            }
                                            store={store}
                                            className="Total"
                                        />
                                        {`/`}
                                        <Currency
                                            price={75}
                                            currency={
                                                cart.cost?.totalAmount?.currencyCode ||
                                                Config.i18n.currencies[0]
                                            }
                                            store={store}
                                            className="Left"
                                        />
                                    </FreeShippingBannerText>
                                </FreeShippingBannerMeta>
                                <Progress className={freeShipping ? 'Full' : ''}>
                                    <ProgressBar
                                        style={{
                                            width: `${
                                                (freeShipping && 100) ||
                                                ((Number.parseFloat(
                                                    cart.cost?.totalAmount?.amount! || '0'
                                                ) || 0) /
                                                    75) *
                                                    100
                                            }%`
                                        }}
                                    />
                                </Progress>
                            </FreeShippingBanner>
                        </Sidebar>
                    </SummaryContainer>
                </Content>

                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'cart'} />,
                            url: '/cart/'
                        }
                    ]}
                    store={store}
                />
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({}) {
    return {
        props: {
            analytics: {
                pageType: AnalyticsPageType.cart
            }
        }
    };
}

export default CartPage;

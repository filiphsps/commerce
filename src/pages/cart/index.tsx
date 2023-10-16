import { AnalyticsPageType, CartLineProvider, useCart } from '@shopify/hydrogen-react';
import type { CartWithActions, ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import { useEffect, useState } from 'react';

import Breadcrumbs from '@/components/Breadcrumbs';
import CartItem from '@/components/CartItem';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { Config } from '@/utils/Config';
import type { CustomPageDocument } from '@/prismic/types';
import type { FunctionComponent } from 'react';
import type { GetStaticProps } from 'next';
import { NextLocaleToLocale } from '@/utils/Locale';
import { NextSeo } from 'next-seo';
import { ProductToMerchantsCenterId } from '@/utils/MerchantsCenterId';
import { RecommendationApi } from '@/api/recommendation';
import type { SSRConfig } from 'next-i18next';
import type { StoreModel } from '@/models/StoreModel';
import { asText } from '@prismicio/client';
import { createClient } from '@/prismic';
import dynamic from 'next/dynamic';
import { getServerTranslations } from '@/utils/getServerTranslations';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const CartSummary = dynamic(() => import('@/components/CartSummary').then((c) => c.CartSummary));
const CollectionBlock = dynamic(() => import('@/components/CollectionBlock'));
const Page = dynamic(() => import('@/components/Page'));
const PageContent = dynamic(() => import('@/components/PageContent'));
const PageHeader = dynamic(() => import('@/components/PageHeader'));
const PageLoader = dynamic(() => import('@/components/PageLoader'));

const Content = styled.div`
    display: grid;
    grid-template-columns: 1fr minmax(auto, 36rem);
    grid-template-areas:
        'header sidebar'
        'content sidebar';
    gap: var(--block-spacer-large);
    max-width: 100%;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        grid-template-areas: 'header' 'sidebar' 'content';
        gap: var(--block-spacer-large);
    }
`;
const ContentWrapper = styled.div`
    grid-area: content;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-large);
    width: 100;
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
        gap: var(--block-spacer);
        width: 100%;
        max-width: 100%;
    }

    @media (min-width: 1418px) {
        border-spacing: 0px;
        table-layout: auto;
        border-collapse: collapse;

        tbody {
            max-width: 100%;

            display: grid;
            grid-template-columns: calc(50% - 0.5rem) calc(50% - 0.5rem);
            gap: var(--block-spacer);
        }
    }
`;

const Sidebar = styled.article`
    grid-area: sidebar;
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-large);
    height: fit-content;

    @media (min-width: 950px) {
        position: sticky;
        top: 8rem;
    }
`;

const Recommendations = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
`;
const RecommendationsTitle = styled.h3`
    display: block;
    color: var(--color-dark);
    font-size: 2rem;
    line-height: 2.25rem;
    font-weight: 700;
`;
const RecommendationsContentWrapper = styled.div`
    display: block;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    color: var(--color-dark);
`;
const RecommendationsContent = styled(PageContent)`
    width: 100%;
`;

// Const hacky workaround for ga4 cross-domain
// Ugly hack taken from StackOverflow
const getCrossDomainLinkerParameter = () => {
    // create form element, give it an action, make it hidden and prevent the submit event
    const formNode = document.createElement('form') as any;
    formNode.action = 'https://opensource.sweetsideofsweden.com';
    formNode.style.opacity = '0';
    formNode.addEventListener('submit', (event: any) => {
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

export const Checkout = async ({
    cart,
    locale,
    locales
}: {
    cart: CartWithActions;
    locale?: string;
    locales?: string[];
}) => {
    if (!cart.totalQuantity || cart.totalQuantity <= 0 || !cart.lines) throw new Error('Cart is empty!');
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
                ecommerce: {
                    currency: cart.cost?.totalAmount?.currencyCode!,
                    value: Number.parseFloat(cart.cost?.totalAmount?.amount!),
                    items: cart.lines.map(
                        (line) =>
                            line && {
                                item_id: ProductToMerchantsCenterId({
                                    locale: (locale !== 'x-default' && locale) || locales?.[1],
                                    productId: line.merchandise?.product?.id!,
                                    variantId: line.merchandise?.id!
                                }),
                                item_name: line.merchandise?.product?.title,
                                item_variant: line.merchandise?.title,
                                item_brand: line.merchandise?.product?.vendor,
                                currency: line.merchandise?.price?.currencyCode!,
                                price: Number.parseFloat(line.merchandise?.price?.amount!) || undefined,
                                quantity: line.quantity
                            }
                    )
                }
            }
        );

        // Microsoft Ads tracking
        if ((window as any).uetq) {
            (window as any).uetq.push('event', 'begin_checkout', {
                ecomm_prodid: cart.lines.map((line) => line && line.merchandise?.id),
                ecomm_pagetype: 'cart',
                ecomm_totalvalue: Number.parseFloat(cart.cost?.totalAmount?.amount! || '0'),
                revenue_value: Number.parseFloat(cart.cost?.totalAmount?.amount! || '0'),
                currency: cart.cost?.totalAmount?.currencyCode!,
                items: cart.lines.map(
                    (line) =>
                        line && {
                            id: line.merchandise?.id,
                            quantity: line.quantity,
                            price: Number.parseFloat(line.merchandise?.price?.amount! || '0')
                        }
                )
            });
        }
    } catch {}

    const ga4 = getCrossDomainLinkerParameter();
    const finalUrl = `${url}${(ga4 && `${(url.includes('?') && '&') || '?'}_gl=${ga4}`) || ''}`;
    window.location.href = finalUrl;
};

interface CartPageProps {
    page?: CustomPageDocument<string>;
    store: StoreModel;
}
const CartPage: FunctionComponent<CartPageProps> = ({ page, store }) => {
    const cart = useCart();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const { data: recommendations } = useSWR(
        [
            'RecommendationApi',
            {
                id:
                    (cart.totalQuantity && cart.totalQuantity > 0 && cart.lines?.[0]?.merchandise?.product?.id) ||
                    undefined,
                locale: router.locale
            }
        ],
        ([, props]) => RecommendationApi(props)
    );

    // TODO: Handle other currencies properly
    let freeShippingThreshold = 85;
    switch (cart?.cost?.totalAmount?.currencyCode?.toUpperCase()) {
        case 'GBP':
            freeShippingThreshold = 70;
            break;
        case 'EUR':
            freeShippingThreshold = 80;
            break;
        case 'SEK':
            freeShippingThreshold = 900;
            break;
        case 'DKK':
            freeShippingThreshold = 575;
            break;
        case 'NOK':
            freeShippingThreshold = 875;
            break;
        case 'CAD':
            freeShippingThreshold = 115;
            break;
        default:
        case 'USD':
            freeShippingThreshold = 85;
            break;
    }
    const freeShipping = Number.parseFloat(cart.cost?.totalAmount?.amount || '0') > freeShippingThreshold;

    useEffect(() => {
        if (!cart?.lines) return;

        (window as any).dataLayer?.push(
            {
                ecommerce: null
            },
            {
                // https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtm#example_45
                // TODO: Move this to the analytics pageview event
                event: 'view_cart',
                ecommerce: {
                    currency: cart.cost?.totalAmount?.currencyCode!,
                    value: Number.parseFloat(cart.cost?.totalAmount?.amount!),
                    items: cart.lines.map(
                        (line) =>
                            line && {
                                item_id: ProductToMerchantsCenterId({
                                    locale: (router.locale !== 'x-default' && router.locale) || router.locales?.[1],
                                    productId: line.merchandise?.product?.id!,
                                    variantId: line.merchandise?.id!
                                }),
                                item_name: line.merchandise?.product?.title,
                                item_variant: line.merchandise?.title,
                                item_brand: line.merchandise?.product?.vendor,
                                currency: line.merchandise?.price?.currencyCode,
                                price: Number.parseFloat(line.merchandise?.price?.amount!) || undefined,
                                quantity: line.quantity
                            }
                    )
                }
            }
        );
    }, [cart]);

    return (
        <Page className="CartPage">
            <NextSeo
                title={page?.data.meta_title || page?.data.title!}
                description={
                    (page?.data?.meta_description && asText(page?.data.meta_description)) ||
                    page?.data?.description! ||
                    ''
                }
                canonical={`https://${Config.domain}/${router.locale}/cart/`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${(locale !== 'x-default' && `${locale}/`) || ''}cart/`
                    })) || []
                }
                openGraph={{
                    url: `https://${Config.domain}${router.locale}/cart/`,
                    type: 'website',
                    title: page?.data.meta_title || page?.data.title!,
                    description:
                        (page?.data.meta_description && asText(page.data.meta_description)) ||
                        page?.data.description ||
                        '',
                    siteName: store?.name,
                    locale: (router.locale !== 'x-default' && router.locale) || Config.i18n.default,
                    images:
                        (page?.data?.meta_image && [
                            {
                                url: page?.data?.meta_image!.url as string,
                                width: page?.data?.meta_image!.dimensions?.width || 0,
                                height: page?.data?.meta_image!.dimensions?.height || 0,
                                alt: page?.data?.meta_image!.alt || '',
                                secureUrl: page?.data?.meta_image!.url as string
                            }
                        ]) ||
                        undefined
                }}
            />

            <PageContent primary>
                <Content>
                    <PageHeader
                        style={{ gridArea: 'header' }}
                        title={page?.data.title}
                        subtitle={page?.data.description}
                        foreground="var(--color-dark)"
                    />

                    <ContentWrapper>
                        <ItemsContainerWrapper>
                            <ItemsContainer>
                                {cart.lines && cart.lines.length >= 1 ? (
                                    <>
                                        <tbody>
                                            {cart.lines?.map((item) => {
                                                if (!item) return null;

                                                return (
                                                    <CartLineProvider key={item.id} line={item}>
                                                        <CartItem />
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

                        {(recommendations?.length && (
                            <Recommendations>
                                <RecommendationsTitle>{`Don't Forget`}</RecommendationsTitle>
                                <RecommendationsContentWrapper>
                                    <RecommendationsContent>
                                        <CollectionBlock
                                            data={
                                                {
                                                    // FIXME: this is hacky
                                                    products: {
                                                        edges: recommendations?.map((product) => ({
                                                            node: product
                                                        }))
                                                    }
                                                } as Collection
                                            }
                                            isHorizontal
                                            store={store}
                                        />
                                    </RecommendationsContent>
                                </RecommendationsContentWrapper>
                            </Recommendations>
                        )) ||
                            null}
                    </ContentWrapper>

                    <Sidebar>
                        <CartSummary
                            showLoader={loading}
                            freeShipping={freeShipping}
                            onCheckout={async () => {
                                if (cart.status !== 'idle' && cart.status !== 'uninitialized') return;
                                setLoading(true);

                                try {
                                    await Checkout({
                                        cart,
                                        locale: router.locale,
                                        locales: router.locales
                                    });
                                } catch (error: any) {
                                    console.error(error);
                                    alert(error.message);
                                    setLoading(false);
                                }
                            }}
                        />
                    </Sidebar>
                </Content>

                <Breadcrumbs
                    pages={[
                        {
                            title: page?.data.title || 'Shopping Cart',
                            url: '/cart/'
                        }
                    ]}
                    store={store}
                />
            </PageContent>
        </Page>
    );
};

export const getStaticProps: GetStaticProps<{
    analytics?: Partial<ShopifyPageViewPayload>;
}> = async ({ locale: localeData, previewData }) => {
    const locale = NextLocaleToLocale(localeData);
    const client = createClient({ previewData });
    try {
        const uid = 'cart';

        let page: any = null;
        try {
            page = await client.getByUID('custom_page', uid, {
                lang: locale.locale
            });
        } catch (error) {
            try {
                page = await client.getByUID('custom_page', uid);
            } catch {}
        }

        let translations: SSRConfig | undefined = undefined;
        try {
            translations = await getServerTranslations(locale.language.toLowerCase(), ['common', 'cart']);
        } catch (error) {
            console.warn(error);
        }

        return {
            props: {
                ...translations,
                page,
                analytics: {
                    pageType: AnalyticsPageType.cart
                }
            },
            revalidate: 60
        };
    } catch (error: any) {
        if (error.message?.includes('No documents')) {
            return {
                notFound: true
            };
        }

        console.error(error);
        return {
            props: {},
            revalidate: 1
        };
    }
};

export default CartPage;

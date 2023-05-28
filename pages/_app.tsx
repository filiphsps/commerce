import 'destyle.css';
import './app.scss';

import {
    DefaultSeo,
    SiteLinksSearchBoxJsonLd,
    SocialProfileJsonLd
} from 'next-seo';
import React, { useEffect, useState } from 'react';
import Router, { useRouter } from 'next/router';
import { getCookie, hasCookie, setCookie } from 'cookies-next';
import { useStore, withStore } from 'react-context-hook';

import { CartProvider } from 'react-use-cart';
import Color from 'color';
import { Config } from '../src/util/Config';
import Head from 'next/head';
import NProgress from 'nprogress';
import PageProvider from '../src/components/PageProvider';
import SEO from '../nextseo.config';
import { ShopifyAnalyticsProvider } from 'react-shopify-analytics';
import { StoreApi } from '../src/api/store';
import { appWithTranslation } from 'next-i18next';
import useCountry from '../src/hooks/country';
import useSWR from 'swr';
import { v4 as uuidv4 } from 'uuid';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', (err) => {
    console.error(err);
    NProgress.done();
});

const StoreApp = withStore(
    ({ Component, pageProps }) => {
        const router = useRouter();
        // eslint-disable-next-line no-unused-vars
        const [cartStore, setCartStore] = useStore<any>('cart');
        // eslint-disable-next-line no-unused-vars
        const [country, setCountry] = useStore('country');
        const [sessionId, setSessionId] = useState<string>();
        const [userId, setUserId] = useState<string>();
        const user_country = useCountry();

        const { data: store } = useSWR([`store`], () => StoreApi() as any, {
            fallbackData: {
                // FIXME: Use CMS for these
                name: 'Sweet Side of Sweden',
                currency: 'USD',
                logo: {
                    src: 'https://cdn.shopify.com/s/files/1/0761/8848/3889/files/Untitled_2x_b42c57d1-aabd-43a2-a0a4-c4acb5e9f100.png?v=1684000882'
                },
                favicon: {
                    src: 'https://cdn.shopify.com/s/files/1/0761/8848/3889/files/logo.png?v=1684000686'
                },
                accent: {
                    primary: Config.colors.primary,
                    secondary: Config.colors.secondary
                },
                color: {
                    primary: '#ffffff',
                    secondary: '#ffffff'
                },
                block: {
                    border_radius: '0.25rem'
                }
            }
        });

        const reportItem = (item) => {
            setCartStore({ open: true, item });
            if (!window || !(window as any)?.dataLayer) return;

            (window as any).dataLayer?.push({ ecommerce: null });
            (window as any).dataLayer?.push({
                event: 'add_to_cart',
                currency: 'USD',
                value: item.price * item.quantity,
                ecommerce: {
                    items: [
                        {
                            item_id: item.id
                                .replaceAll('gid://shopify/Product/', '')
                                .replaceAll('gid://shopify/ProductVariant', ''),
                            item_name: item.title,
                            item_variant: item.variant_title,
                            item_brand: item.brand,
                            currency: 'USD',
                            quantity: item.quantity,
                            price: item.price
                        }
                    ]
                }
            });

            // Microsoft Ads tracking
            if ((window as any).uetq) {
                let page_type = 'home';
                if (router.pathname.includes('products')) page_type = 'product';
                else if (router.pathname.includes('collections'))
                    page_type = 'collection';

                (window as any).uetq.push('event', 'add_to_cart', {
                    ecomm_prodid: [
                        item.id
                            .replaceAll('gid://shopify/Product/', '')
                            .replaceAll('gid://shopify/ProductVariant', '')
                    ],
                    ecomm_pagetype: page_type,
                    ecomm_totalvalue: item.price * item.quantity,
                    revenue_value: 1,
                    currency: 'USD',
                    items: [
                        {
                            id: item.id,
                            quantity: item.quantity,
                            price: item.price
                        }
                    ]
                });
            }
        };

        useEffect(() => {
            if (!hasCookie('session'))
                setCookie('session', uuidv4(), { maxAge: 60 * 60 * 24 });
            if (!hasCookie('user'))
                setCookie('user', uuidv4(), { maxAge: 60 * 60 * 24 * 365 });

            setSessionId(getCookie('session') as string);
            setUserId(getCookie('user') as string);
        }, []);

        useEffect(() => {
            if (!user_country.code) return;
            setCountry(user_country.code);
        }, [user_country]);

        return (
            <>
                <DefaultSeo
                    {...SEO}
                    twitter={{
                        cardType: 'summary_large_image',
                        handle: '@sweetsideofsweden',
                        site: 'sweetsideofsweden.com'
                    }}
                />
                <Head>
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1, user-scalable=no"
                    />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta
                        name="apple-mobile-web-app-status-bar-style"
                        content="black-translucent"
                    />
                    <meta
                        name="apple-mobile-web-app-title"
                        content={store.name}
                    />
                    <link
                        rel="icon"
                        type="image/png"
                        href={store.favicon.src}
                    />
                    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                    <link rel="apple-touch-icon" href={store.favicon.src} />
                    {/* General application styling */}
                    {/* eslint-disable indent */}
                    <style>{`
                        body {
                            --color-text-primary: #ffffff;
                            --accent-primary: ${Color(store.accent.primary)
                                .hex()
                                .toString()};
                            --accent-primary-dark: ${Color(store.accent.primary)
                                .darken(0.25)
                                .hex()
                                .toString()};
                            --accent-primary-light: ${Color(
                                store.accent.primary
                            )
                                .lighten(0.45)
                                .hex()
                                .toString()};
                            --accent-secondary: ${Color(store.accent.secondary)
                                .hex()
                                .toString()};
                            --accent-secondary-dark: ${Color(
                                store.accent.secondary
                            )
                                .darken(0.25)
                                .hex()
                                .toString()};
                            --accent-secondary-light: ${Color(
                                store.accent.secondary
                            )
                                .lighten(0.25)
                                .hex()
                                .toString()};
                            --block-border-radius: ${store.block.border_radius};
                            background: var(--accent-primary);
                        }
                    `}</style>
                    {/* eslint-enable indent */}
                </Head>

                <SiteLinksSearchBoxJsonLd
                    url={`https://${Config.domain}/`}
                    potentialActions={[
                        {
                            target: `https://${Config.domain}/search/?q`,
                            queryInput: 'search_term_string'
                        }
                    ]}
                />
                <SocialProfileJsonLd
                    type="Organization"
                    name={store.name}
                    url={`https://${Config.domain}/`}
                    sameAs={[
                        'https://instagram.com/sweetsideofsweden',
                        'https://twitter.com/sweetsideofsweden'
                    ]}
                />

                {/* Page */}
                <CartProvider onItemAdd={reportItem} onItemUpdate={reportItem}>
                    <PageProvider store={store}>
                        <Component
                            key={router.asPath}
                            {...pageProps}
                            store={store}
                        />
                    </PageProvider>
                </CartProvider>
                {userId && sessionId ? (
                    <ShopifyAnalyticsProvider
                        shopId={76188483889}
                        route={
                            router.pathname.includes('/shop')
                                ? router.pathname
                                      .replace('/shop', '/products')
                                      .replace('/en-US', '')
                                : router.pathname
                        }
                        userId={userId}
                        sessionId={sessionId}
                    />
                ) : null}
            </>
        );
    },
    {
        currency: 'USD',
        country: 'US',
        rates: {},
        search: {
            open: false,
            phrase: ''
        },
        cart: {
            open: false,
            item: null
        }
    },
    {
        listener: () => {},
        logging: false
    }
);

export default appWithTranslation(StoreApp);

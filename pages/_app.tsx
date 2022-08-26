import 'destyle.css';
import './app.scss';

import Router, { useRouter } from 'next/router';
import { useStore, withStore } from 'react-context-hook';

import { CartProvider } from 'react-use-cart';
import Color from 'color';
import { DefaultSeo } from 'next-seo';
import Head from 'next/head';
import NProgress from 'nprogress';
import PageProvider from '../src/components/PageProvider';
import React from 'react';
import SEO from '../nextseo.config';
import ScrollToTop from '../src/components/ScrollToTop';
import ShopifyAnalytics from '../src/components/ShopifyAnalytics';
import { appWithTranslation } from 'next-i18next';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', (err) => {
    console.error(err);
    NProgress.done();
});

const StoreApp = withStore(
    ({ Component, pageProps }) => {
        const router = useRouter();
        const [contextStore] = useStore<any>('store');

        return (
            <>
                <DefaultSeo {...SEO} />
                <Head>
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1"
                    />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta
                        name="apple-mobile-web-app-status-bar-style"
                        content="black-translucent"
                    />
                    <meta
                        name="apple-mobile-web-app-title"
                        content="Candy By Sweden"
                    />
                    <link
                        rel="icon"
                        type="image/png"
                        href="https://cdn.shopify.com/s/files/1/0604/8556/6618/files/Candy_By_Sweden_1.png?v=1652354115"
                    />
                    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                    <link
                        rel="apple-touch-icon"
                        href="https://cdn.shopify.com/s/files/1/0604/8556/6618/files/Candy_By_Sweden_1.png?v=1652354115"
                    />
                    {/* General application styling */}
                    {/* eslint-disable indent */}
                    <style>{`
                        body {
                            --color-text-primary: #ffffff;
                            --accent-primary: ${Color('#0476D9')
                                .hex()
                                .toString()};
                            --accent-primary-dark: ${Color('#0476D9')
                                .darken(0.25)
                                .hex()
                                .toString()};
                            --accent-primary-light: ${Color('#0476D9')
                                .lighten(0.25)
                                .hex()
                                .toString()};
                            --accent-secondary: ${Color('#F7D435')
                                .hex()
                                .toString()};
                            --accent-secondary-dark: ${Color('#F7D435')
                                .darken(0.25)
                                .hex()
                                .toString()};
                            --accent-secondary-light: ${Color('#F7D435')
                                .lighten(0.25)
                                .hex()
                                .toString()};
                            --block-border-radius: 0.5rem;
                        }
                    `}</style>
                    {/* eslint-enable indent */}
                </Head>

                {/* Page */}
                <CartProvider
                    onItemAdd={(item) => {
                        if (!window || !(window as any)?.dataLayer) return;

                        (window as any).dataLayer.push({ ecommerce: null });
                        (window as any).dataLayer.push({
                            event: 'add_to_cart',
                            currency: 'USD',
                            value: item.price,
                            ecommerce: {
                                items: [
                                    {
                                        item_id: item.id,
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
                            if (router.pathname.includes('products'))
                                page_type = 'product';
                            else if (router.pathname.includes('collections'))
                                page_type = 'collection';

                            (window as any).uetq.push('event', 'add_to_cart', {
                                ecomm_prodid: [
                                    item.id
                                        .replaceAll(
                                            'gid://shopify/Product/',
                                            ''
                                        )
                                        .replaceAll(
                                            'gid://shopify/ProductVariant',
                                            ''
                                        )
                                ],
                                ecomm_pagetype: page_type,
                                ecomm_totalvalue: item.price,
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
                    }}
                >
                    <PageProvider store={contextStore}>
                        <Component
                            key={router.asPath}
                            {...pageProps}
                            store={contextStore}
                        />
                    </PageProvider>
                </CartProvider>
                <ScrollToTop />
                <ShopifyAnalytics />
            </>
        );
    },
    {
        store: {
            name: 'Candy By Sweden',
            currency: 'USD',
            logo: {
                src: 'https://cdn.shopify.com/s/files/1/0604/8556/6618/files/cbs-logo.png?v=1652349590'
            },
            accent: {
                primary: '#0476D9',
                secondary: '#F7D435'
            },
            color: {
                primary: '#ffffff',
                secondary: '#ffffff'
            },
            block: {
                border_radius: 0.5
            },
            navigation: []
        },
        currency: 'USD',
        search: {
            open: false,
            phrase: ''
        }
    },
    {
        listener: () => {},
        logging: false
    }
);

export default appWithTranslation(StoreApp);

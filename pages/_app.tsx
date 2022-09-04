import 'destyle.css';
import './app.scss';

import Router, { useRouter } from 'next/router';
import { useStore, withStore } from 'react-context-hook';

import { CartProvider } from 'react-use-cart';
import Color from 'color';
import { Config } from '../src/util/Config';
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
        const [cartStore, setCartStore] = useStore<any>('cart');

        const reportItem = (item) => {
            setCartStore({ open: true, item });
            if (!window || !(window as any)?.dataLayer) return;

            (window as any).dataLayer.push({ ecommerce: null });
            (window as any).dataLayer.push({
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

        return (
            <>
                <DefaultSeo {...SEO} />
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
                        content={contextStore.name}
                    />
                    <link
                        rel="icon"
                        type="image/png"
                        href={contextStore.favicon.src}
                    />
                    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                    <link
                        rel="apple-touch-icon"
                        href={contextStore.favicon.src}
                    />
                    {/* General application styling */}
                    {/* eslint-disable indent */}
                    <style>{`
                        body {
                            --color-text-primary: #ffffff;
                            --accent-primary: ${Color(Config.colors.primary)
                                .hex()
                                .toString()};
                            --accent-primary-dark: ${Color(
                                Config.colors.primary
                            )
                                .darken(0.25)
                                .hex()
                                .toString()};
                            --accent-primary-light: ${Color(
                                Config.colors.primary
                            )
                                .lighten(0.25)
                                .hex()
                                .toString()};
                            --accent-secondary: ${Color(Config.colors.secondary)
                                .hex()
                                .toString()};
                            --accent-secondary-dark: ${Color(
                                Config.colors.secondary
                            )
                                .darken(0.25)
                                .hex()
                                .toString()};
                            --accent-secondary-light: ${Color(
                                Config.colors.secondary
                            )
                                .lighten(0.25)
                                .hex()
                                .toString()};
                            --block-border-radius: 0.5rem;
                            background: var(--accent-primary);
                        }
                    `}</style>
                    {/* eslint-enable indent */}
                </Head>

                {/* Page */}
                <CartProvider onItemAdd={reportItem} onItemUpdate={reportItem}>
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
            // FIXME: Use CMS for these
            name:
                Config.domain === 'candybysweden.com'
                    ? 'Candy by Sweden'
                    : 'happysnus',
            currency: 'USD',
            logo: {
                src:
                    Config.domain === 'candybysweden.com'
                        ? 'https://cdn.shopify.com/s/files/1/0604/8556/6618/files/cbs-logo.png?v=1652349590'
                        : 'https://cdn.shopify.com/s/files/1/0660/1536/3330/files/happysnus_20e4072c-241e-48f5-a1e4-8121fe0f731c.png?v=1662282004'
            },
            favicon: {
                src:
                    Config.domain === 'candybysweden.com'
                        ? 'https://cdn.shopify.com/s/files/1/0604/8556/6618/files/Candy_By_Sweden_1.png?v=1652354115'
                        : 'https://cdn.shopify.com/s/files/1/0660/1536/3330/files/happysnus_favicon.png?v=1662281347'
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
                border_radius: 0.5
            },
            navigation: []
        },
        currency: 'USD',
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

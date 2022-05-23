import 'destyle.css';
import './app.scss';

import React, { useEffect } from 'react';
import Router, { useRouter } from 'next/router';
import { useStore, withStore } from 'react-context-hook';

import Cart from '../src/util/cart';
import Color from 'color';
import Head from 'next/head';
import NProgress from 'nprogress';
import PageProvider from '../src/components/PageProvider';
import ScrollToTop from '../src/components/ScrollToTop';

Router.events.on('routeChangeStart', (url) => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', (err) => {
    console.error(err);
    NProgress.done();
});

const StoreApp = withStore(
    ({ Component, pageProps }) => {
        const router = useRouter();
        const [contextStore] = useStore<any>('store');
        const [cart, setCart] = useStore<any>('cart');

        useEffect(() => {
            if (cart) return;

            Cart.Get()
                .then(setCart)
                .catch((error) => error && console.warn(error));
        }, []);

        return (
            <>
                <Head>
                    <title>Candy By Sweden</title>
                    <meta
                        name="viewport"
                        content="initial-scale=1, viewport-fit=cover, width=device-width, user-scalable=no"
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

                    <meta name="theme-color" content={'#0476D9'} />
                </Head>

                <noscript
                    dangerouslySetInnerHTML={{
                        __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KL4HWGJ" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
                    }}
                ></noscript>

                {/* Page */}
                <PageProvider store={contextStore}>
                    <Component
                        key={router.asPath}
                        {...pageProps}
                        store={contextStore}
                    />
                </PageProvider>
                <ScrollToTop />
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
        cart: null,
        search: {
            open: false,
            phrase: ''
        }
    },
    {
        listener: () => {},
        logging: false //process.env.NODE_ENV !== 'production'
    }
);

export default StoreApp;

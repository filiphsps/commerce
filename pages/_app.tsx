import 'destyle.css';
import './app.scss';

import { NavigationApi, StoreApi } from '../src/api';
import React, { useEffect } from 'react';
import Router, { useRouter } from 'next/router';
import { useStore, withStore } from 'react-context-hook';

import Cart from '../src/util/cart';
import Color from 'color';
import Head from 'next/head';
import NProgress from 'nprogress';
import PageProvider from '../src/components/PageProvider';
import Script from 'next/script';
import ScrollToTop from '../src/components/ScrollToTop';
import ShopifyAnalytics from '../src/components/ShopifyAnalytics';

Router.events.on('routeChangeStart', (url) => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', (err) => {
    console.error(err);
    NProgress.done();
});

const store: any = {
    title: 'Candy By Sweden',
    description:
        'Ahlgreens Bilar, Marabou, Cloetta, Malaco, Fazer and way way more. Only at Candy By Sweden',
    favicons: [
        {
            type: 'png',
            src: 'https://cdn.shopify.com/s/files/1/0604/8556/6618/files/Candy_By_Sweden_1.png?v=1652354115'
        }
    ],
    currencies: ['USD'],
    language: 'en_US',
    languages: ['en_US']
};

const StoreApp = withStore(
    ({ Component, pageProps }) => {
        const router = useRouter();
        const [contextStore, setStore] = useStore<any>('store');
        const [currency, setCurrency] = useStore<any>('currency');
        const [cart, setCart] = useStore<any>('cart');

        // FIXME: use app.getStaticProps when it's supported by nextjs.
        useEffect(() => {
            try {
                // Configure the frontend to the specific store we're serving
                // TODO: await for App.getStaticProps to be supported!
                if (!contextStore) {
                    StoreApi(router.locale).then(async (data: any) => {
                        const navigation: any = await NavigationApi(
                            router.locale
                        );

                        setStore({
                            ...store,
                            name: data.store_name,
                            currency: data.currency,
                            logo: {
                                src: data.logo
                            },
                            accent: {
                                primary: data.primary,
                                secondary: data.secondary
                            },
                            color: {
                                primary: data.primary_text_color,
                                secondary: data.secondary_text_color
                            },
                            block: {
                                border_radius: data.border_radius
                            },
                            navigation: navigation.map((item) => ({
                                title: item.title,
                                href: `/${item.handle || ''}`
                            }))
                        });
                    });
                }

                if (!currency) setCurrency(store?.currency);
                if (!cart)
                    Cart.Get()
                        .then(setCart)
                        .catch((error) => error && console.warn(error));

                // Handle currency settings
                if (window?.localStorage?.getItem('currency')) {
                    setCurrency(window?.localStorage?.getItem('currency'));
                }
            } catch (err) {
                console.error(err);
            }
        }, [store, contextStore]);

        if (!contextStore) return null;

        return (
            <>
                <Head>
                    {<title>{contextStore?.title}</title>}
                    <meta
                        name="viewport"
                        content="initial-scale=1, viewport-fit=cover, width=device-width, user-scalable=no"
                    />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta
                        name="apple-mobile-web-app-status-bar-style"
                        content="black-translucent"
                    />
                    {contextStore && (
                        <meta
                            name="apple-mobile-web-app-title"
                            content={contextStore?.name}
                        />
                    )}

                    {contextStore?.favicons?.map((favicon, index) => {
                        return (
                            <React.Fragment key={index}>
                                <link
                                    rel="icon"
                                    type={`image/${favicon?.type}`}
                                    href={favicon?.src}
                                />
                                <link
                                    rel="apple-touch-icon"
                                    href={favicon?.src}
                                />
                            </React.Fragment>
                        );
                    })}

                    {/* General application styling */}
                    <style>{`
                    body {
                        --color-text-primary: ${Color(
                            contextStore?.color?.primary
                        )
                            .hex()
                            .toString()};
                        --accent-primary: ${Color(contextStore?.accent?.primary)
                            .hex()
                            .toString()};
                        --accent-primary-dark: ${Color(
                            contextStore?.accent?.primary
                        )
                            .darken(0.25)
                            .hex()
                            .toString()};
                        --accent-primary-light: ${Color(
                            contextStore?.accent?.primary
                        )
                            .lighten(0.25)
                            .hex()
                            .toString()};
                        --accent-secondary: ${Color(
                            contextStore?.accent?.secondary
                        )
                            .hex()
                            .toString()};
                        --accent-secondary-dark: ${Color(
                            contextStore?.accent?.secondary
                        )
                            .darken(0.25)
                            .hex()
                            .toString()};
                        --accent-secondary-light: ${Color(
                            contextStore?.accent?.secondary
                        )
                            .lighten(0.25)
                            .hex()
                            .toString()};
                        --block-border-radius: ${
                            contextStore?.block?.border_radius
                        }rem;
                    }
                `}</style>
                    {contextStore && (
                        <meta
                            name="theme-color"
                            content={contextStore?.accent?.primary}
                        />
                    )}
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
        store: null,
        currency: null,
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

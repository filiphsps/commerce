import 'destyle.css';
import './app.scss';

import { Provider as AlertProvider, positions, transitions } from 'react-alert';
import { NavigationApi, StoreApi } from '../src/api';
import React, { useEffect } from 'react';
import Router, { useRouter } from 'next/router';
import { useStore, withStore } from 'react-context-hook';

import Alert from '../src/components/Alert';
import Cart from '../src/util/cart';
import Color from 'color';
import Head from 'next/head';
import NProgress from 'nprogress';
import PageProvider from '../src/components/PageProvider';
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
    description: '',
    favicons: [
        {
            type: 'png',
            src: 'https://cdn.shopify.com/s/files/1/1352/5845/files/favicon_fa097bc7-aa5c-4903-802e-27de4d33a732.png?v=1583742670'
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
            <AlertProvider
                template={Alert}
                {...{
                    position: positions.TOP_LEFT,
                    timeout: 6500,
                    offset: '1rem',
                    transition: transitions.FADE
                }}
            >
                <Head>
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `console.log('Developed by Filiph Sandström https://github.com/filiphsandstrom');`
                        }}
                    />

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
                    <script
                        defer
                        src="https://shynet.sandstromsandberg.com/ingress/74dc21f9-f1bf-4add-8833-c0364673e40b/script.js"
                    />
                    <script defer src="/js/shopify-analytics.js" />

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

                {/* Page */}
                <PageProvider store={contextStore}>
                    <Component
                        key={router.asPath}
                        {...pageProps}
                        store={contextStore}
                    />
                </PageProvider>
                <ScrollToTop />
                <ShopifyAnalytics />
            </AlertProvider>
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

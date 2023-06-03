import 'destyle.css';
import './app.scss';

import * as Sentry from '@sentry/nextjs';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import {
    CountryCode,
    LanguageCode
} from '@shopify/hydrogen-react/storefront-api-types';
import {
    DefaultSeo,
    SiteLinksSearchBoxJsonLd,
    SocialProfileJsonLd
} from 'next-seo';
import React, { useEffect, useState } from 'react';
import Router, { useRouter } from 'next/router';
import { getCookie, hasCookie, setCookie } from 'cookies-next';
import { useStore, withStore } from 'react-context-hook';

import Color from 'color';
import { Config } from '../src/util/Config';
import Head from 'next/head';
import NProgress from 'nprogress';
import PageProvider from '../src/components/PageProvider';
import SEO from '../nextseo.config';
import { ShopifyAnalyticsProvider } from 'react-shopify-analytics';
import { StoreApi } from '../src/api/store';
import { appWithTranslation } from 'next-i18next';
import useSWR from 'swr';
import { v4 as uuidv4 } from 'uuid';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', (err) => {
    console.error(err);
    NProgress.done();
});

const StoreApp = withStore(
    ({ Component, pageProps, locale }) => {
        const router = useRouter();
        // eslint-disable-next-line no-unused-vars
        const [cartStore, setCartStore] = useStore<any>('cart');
        // eslint-disable-next-line no-unused-vars
        const [sessionId, setSessionId] = useState<string>();
        const [userId, setUserId] = useState<string>();

        const country = (locale?.split('-')[1] || 'US') as CountryCode;
        const language = (locale?.split('-')[0].toUpperCase() ||
            'EN') as LanguageCode;

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

        useEffect(() => {
            if (!hasCookie('session'))
                setCookie('session', uuidv4(), { maxAge: 60 * 60 * 24 });
            if (!hasCookie('user'))
                setCookie('user', uuidv4(), { maxAge: 60 * 60 * 24 * 365 });

            setSessionId(getCookie('session') as string);
            setUserId(getCookie('user') as string);
        }, []);

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
                <ShopifyProvider
                    storeDomain={`https://${Config.shopify.domain}`}
                    storefrontApiVersion={Config.shopify.api}
                    storefrontToken={Config.shopify.token}
                    countryIsoCode={country}
                    languageIsoCode={language}
                >
                    <CartProvider countryCode={country}>
                        <PageProvider store={store}>
                            <Component
                                key={router.asPath}
                                {...pageProps}
                                store={store}
                            />
                        </PageProvider>
                    </CartProvider>
                </ShopifyProvider>

                {process.env.NODE_ENV !== 'development' &&
                userId &&
                sessionId ? (
                    <ShopifyAnalyticsProvider
                        shopId={Config.shopify.shop_id}
                        route={(router.pathname.includes('/shop')
                            ? router.pathname.replace('/shop', '/products')
                            : router.pathname
                        ).replace(`/${router.locale}`, '')}
                        userId={userId}
                        sessionId={sessionId}
                    />
                ) : null}
            </>
        );
    },
    {
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

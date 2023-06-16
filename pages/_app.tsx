import 'destyle.css';
import './app.scss';

import {
    AnalyticsEventName,
    CartProvider,
    ShopifyProvider,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useShopifyCookies
} from '@shopify/hydrogen-react';
import { CountryCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import { DefaultSeo, SiteLinksSearchBoxJsonLd, SocialProfileJsonLd } from 'next-seo';
import React, { useEffect } from 'react';
import Router, { useRouter } from 'next/router';

import Color from 'color';
import { Config } from '../src/util/Config';
import Head from 'next/head';
import NProgress from 'nprogress';
import PageProvider from '../src/components/PageProvider';
import { PrismicPreview } from '@prismicio/next';
import SEO from '../nextseo.config';
import { StoreApi } from '../src/api/store';
import { appWithTranslation } from 'next-i18next';
import prismicConfig from '../slicemachine.config.json';
import useSWR from 'swr';
import { withStore } from 'react-context-hook';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', (err) => {
    console.error(err);
    NProgress.done();
});

const sendPageView = (analyticsPageData: any, locale: string = Config.i18n.locales[0]) => {
    const clientParams = getClientBrowserParameters();
    const payload = {
        ...clientParams,
        path: clientParams.path.replace(`/${locale}`, ''),
        url: clientParams.url.replace(`/${locale}`, ''),
        navigationType: 'navigate',
        ...analyticsPageData
    };
    // eslint-disable-next-line no-console
    console.log('Sending PageView event for', JSON.stringify(payload, null, 4));
    sendShopifyAnalytics(
        {
            eventName: AnalyticsEventName.PAGE_VIEW,
            payload
        },
        // TODO: do this properly
        `checkout.${Config.domain.replace('www.', '').replace('preview.', '').replace('staging.', '')}`
    );
};

const StoreApp = withStore(
    ({ Component, pageProps, locale }) => {
        const router = useRouter();
        useShopifyCookies({
            hasUserConsent: true,
            domain: (process.env.NODE_ENV !== 'development' && `${Config.domain}`
                .replace('checkout.', '')
                .replace('www.', '')
                .replace('preview.', '')
                .replace('staging.', '')) || undefined
        });

        const country = (
            locale?.split('-')[1] || Config.i18n.locales[0].split('-')[1]
        ).toUpperCase() as CountryCode;
        const language = (
            locale?.split('-')[0] || Config.i18n.locales[0].split('-')[0]
        ).toUpperCase() as LanguageCode;

        const { data: store } = useSWR([`store`], () => StoreApi({ locale: router.locale }) as any, {
            fallbackData: {
                // FIXME: Use CMS for these
                name: 'Sweet Side of Sweden',
                currency: 'USD',
                logo: {
                    src: 'https://cdn.shopify.com/s/files/1/0761/8848/3889/files/logo_d38724cd-5589-4b7a-9f61-62c274f52720.png?v=1686651235'
                },
                favicon: {
                    src: 'https://cdn.shopify.com/s/files/1/0761/8848/3889/files/favicon.png?v=1686651228'
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

        const analyticsShopData = {
            shopId: `gid://shopify/Shop/${Config.shopify.shop_id}`,
            currency: 'USD',
            acceptedLanguage: language
        };
        const analytics = {
            hasUserConsent: true,
            ...analyticsShopData,
            ...pageProps.analytics
        };
        useEffect(() => {
            const handleRouteChange = () => {
                sendPageView(analytics, router.locale);
            };

            router.events.on('routeChangeComplete', handleRouteChange);

            return () => {
                router.events.off('routeChangeComplete', handleRouteChange);
            };
        }, [analytics, router.events]);
        // FIXME: Send initial pageView too

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
                    <meta name="apple-mobile-web-app-title" content={store.name} />
                    <link rel="icon" type="image/png" href={store.favicon.src} />
                    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                    <link rel="apple-touch-icon" href={store.favicon.src} />
                    {/* General application styling */}
                    {/* TODO: Move this to app layout */}
                    {/* eslint-disable indent */}
                    <style>{`
                        body {
                            --color-text-primary: #fefefe;
                            --color-text-dark: #0e0e0e;
                            --color-danger: #d91e18;
                            --color-sale: #d91e18;
                            --accent-primary: ${Color(store.accent.primary).hex().toString()};
                            --accent-primary-dark: ${Color(store.accent.primary)
                            .darken(0.25)
                            .hex()
                            .toString()};
                            --accent-primary-light: ${Color(store.accent.primary)
                            .lighten(0.45)
                            .hex()
                            .toString()};
                            --accent-secondary: ${Color(store.accent.secondary).hex().toString()};
                            --accent-secondary-dark: ${Color(store.accent.secondary)
                            .darken(0.25)
                            .hex()
                            .toString()};
                            --accent-secondary-light: ${Color(store.accent.secondary)
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
                    storefrontId={`${Config.shopify.shop_id}`}
                    storeDomain={`https://${Config.shopify.domain}`}
                    storefrontApiVersion={Config.shopify.api}
                    storefrontToken={Config.shopify.token}
                    countryIsoCode={country}
                    languageIsoCode={language}
                >
                    {/* TODO: Add analytics for cart events */}
                    <CartProvider countryCode={country}>
                        <PageProvider store={store}>
                            <Component
                                key={router.asPath}
                                {...pageProps}
                                { ...analytics}
                                store={store}
                            />
                        </PageProvider>
                    </CartProvider>
                </ShopifyProvider>
                <PrismicPreview repositoryName={prismicConfig.repositoryName} />
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
        listener: () => { },
        logging: false
    }
);

export default appWithTranslation(StoreApp);

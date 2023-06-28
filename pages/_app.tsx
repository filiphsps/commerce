import 'destyle.css';
import './app.scss';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { DefaultSeo, SocialProfileJsonLd } from 'next-seo';
import { NextLocaleToCountry, NextLocaleToLanguage } from '../src/util/Locale';
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
import preval from '../src/data.preval';
import prismicConfig from '../slicemachine.config.json';
import useSWR from 'swr';
import { withStore } from 'react-context-hook';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', (err) => {
    console.error(err);
    NProgress.done();
});

const StoreApp = withStore(
    ({ Component, pageProps, locale: initialLocale }) => {
        const router = useRouter();

        const { data: store } = useSWR([`store`], () => StoreApi({ locale: router.locale }), {
            fallbackData: preval.store
        });

        const country = NextLocaleToCountry(router.locale || initialLocale);
        const language = NextLocaleToLanguage(router.locale || initialLocale);

        if (!store) return null;

        return (
            <>
                <DefaultSeo
                    {...SEO}
                    themeColor={Color(store.accent.primary).hex().toString()}
                    twitter={{
                        cardType: 'summary_large_image',
                        handle: '@sweetsideofsweden',
                        site: 'sweetsideofsweden.com'
                    }}
                />
                <Head>
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1, shrink-to-fit=no"
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

                {/* TODO: Get this dynamically */}
                <SocialProfileJsonLd
                    type="Organization"
                    name={store.name}
                    description={store.description}
                    url={`https://${Config.domain}/${router.locale}/`}
                    logo={store.favicon.src}
                    foundingDate="2023"
                    founders={[
                        {
                            '@type': 'Person',
                            name: 'Dennis Sahlin',
                            email: 'dennis@sweetsideofsweden.com',
                            jobTitle: 'CEO'
                        },
                        {
                            '@type': 'Person',
                            name: 'Filiph Siitam Sandström',
                            email: 'filiph@sweetsideofsweden.com',
                            jobTitle: 'CTO'
                        }
                    ]}
                    address={{
                        '@type': 'PostalAddress',
                        streetAddress: 'Österrådagatan 11C',
                        addressLocality: 'Mellerud',
                        addressRegion: 'Västra Götaland',
                        postalCode: '46431',
                        addressCountry: 'Sweden'
                    }}
                    contactPoint={{
                        '@type': 'ContactPoint',
                        contactType: 'Customer relations and support',
                        email: 'dennis@sweetsideofsweden.com',
                        telephone: '+46-73-511-58-50',
                        url: `https://${Config.domain}/${router.locale}/about/`,
                        availableLanguage: ['English', 'Swedish'],
                        areaServed:
                            store.payment?.countries.map(({ isoCode }) => isoCode) ||
                            router.locales
                                ?.filter((i) => i !== 'x-default')
                                .map((i) => i.split('-')[1]) ||
                            (router.locale && []) ||
                            undefined
                    }}
                    sameAs={store.social?.map(({ url }) => url)}
                />

                {/* Page */}
                <ShopifyProvider
                    storefrontId={`${store.id}`}
                    storeDomain={`https://${Config.domain.replace('www', 'checkout')}`}
                    storefrontApiVersion={Config.shopify.api}
                    storefrontToken={Config.shopify.token}
                    countryIsoCode={country}
                    languageIsoCode={language}
                >
                    <CartProvider countryCode={country}>
                        <PageProvider
                            store={store}
                            pagePropsAnalyticsData={pageProps.analytics || {}}
                        >
                            <Component key={router.asPath} {...pageProps} store={store} />
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
        },
        locale: null
    },
    {
        listener: () => {},
        logging: false
    }
);

export default appWithTranslation(StoreApp);

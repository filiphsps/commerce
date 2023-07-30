import 'destyle.css';
import './app.scss';

import type { AppProps, NextWebVitalsMetric } from 'next/app';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { DefaultSeo, SiteLinksSearchBoxJsonLd, SocialProfileJsonLd } from 'next-seo';
import { NextLocaleToCountry, NextLocaleToLanguage } from '../src/util/Locale';
import Router, { useRouter } from 'next/router';
import { StyleSheetManager, ThemeProvider } from 'styled-components';

import { CartFragment } from 'src/api/cart';
import { Config } from '../src/util/Config';
import Head from 'next/head';
import { Lexend_Deca } from 'next/font/google';
import NProgress from 'nprogress';
import NextAdapterPages from 'next-query-params/pages';
import PageProvider from '@/components/PageProvider';
import { PrismicPreview } from '@prismicio/next';
import { QueryParamProvider } from 'use-query-params';
import SEO from '../nextseo.config';
import { StoreApi } from '../src/api/store';
import { i18n } from 'next-i18next.config.cjs';
import preval from '../src/data.preval';
import useSWR from 'swr';

const font = Lexend_Deca({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
    preload: true
});

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());
Router.events.on('hashChangeComplete', () => NProgress.done());

const StoreApp = ({ Component, pageProps }: AppProps) => {
    const router = useRouter();

    const { data: store } = useSWR([`store_${router.locale}`], () => StoreApi({ locale: router.locale }), {
        fallbackData: preval.store!
    });

    const country = NextLocaleToCountry(router.locale || i18n.defaultLocale);
    const language = NextLocaleToLanguage(router.locale || i18n.defaultLocale);

    if (!store) return null;

    return (
        <>
            <style jsx global>{`
                html,
                body {
                    font-family:
                        ${font.style.fontFamily},
                        -apple-system,
                        BlinkMacSystemFont,
                        'Segoe UI',
                        Roboto,
                        Oxygen,
                        Ubuntu,
                        Cantarell,
                        sans-serif;
                }
            `}</style>
            <DefaultSeo {...SEO} themeColor={store?.accent.primary} />
            <Head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, shrink-to-fit=no"
                />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content={store?.name} />
                <link rel="icon" type="image/png" href={store?.favicon.src} />
                <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href={store?.favicon.src} />

                {/* General application styling */}
                {/* eslint-disable indent */}
                <style>{`
                        :root {
                            --accent-primary: ${store?.accent.primary};
                            --accent-primary-dark: color-mix(
                                in srgb,
                                var(--accent-primary) 65%,
                                var(--color-dark)
                            );
                            --accent-primary-light: color-mix(
                                in srgb,
                                var(--accent-primary) 75%,
                                var(--color-bright)
                            );
                            --accent-primary-text: #ececec;

                            --accent-secondary: ${store?.accent.secondary};
                            --accent-secondary-dark: color-mix(
                                in srgb,
                                var(--accent-secondary) 65%,
                                var(--color-dark)
                            );
                            --accent-secondary-light: color-mix(
                                in srgb,
                                var(--accent-secondary) 35%,
                                var(--color-bright)
                            );
                            --accent-secondary-text: #101418;
                        }
                    `}</style>
                {/* eslint-enable indent */}
            </Head>

            {/* TODO: Get this dynamically */}
            <SocialProfileJsonLd
                type="Organization"
                name={store?.name}
                description={store?.description}
                url={`https://${Config.domain}/`}
                logo={store?.favicon.src}
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
                        store?.payment?.countries?.map(({ isoCode }) => isoCode) ||
                        router.locales
                            ?.filter((i) => i !== 'x-default')
                            .map((i) => i.split('-')[1]) ||
                        (router.locale && []) ||
                        undefined
                }}
                sameAs={store?.social?.map(({ url }) => url)}
            />
            <SiteLinksSearchBoxJsonLd
                name={'Sweet Side of Sweden'}
                alternateName={'sweetsideofsweden'}
                url={`https://${Config.domain}/`}
                potentialActions={[
                    {
                        target: `https://${Config.domain}/search/?q`,
                        queryInput: 'search_term_string'
                    }
                ]}
            />

            {/* Page */}
            <QueryParamProvider adapter={NextAdapterPages}>
                <ShopifyProvider
                    storefrontId={`${store?.id}`}
                    storeDomain={`https://${Config.domain.replace('www', 'checkout')}`}
                    storefrontApiVersion={Config.shopify.api}
                    storefrontToken={Config.shopify.token}
                    countryIsoCode={country}
                    languageIsoCode={language}
                >
                    <CartProvider countryCode={country} cartFragment={CartFragment}>
                        <StyleSheetManager enableVendorPrefixes>
                            <ThemeProvider theme={{}}>
                                <PrismicPreview repositoryName={Config.prismic.name}>
                                    <PageProvider
                                        store={store}
                                        pagePropsAnalyticsData={pageProps.analytics || {}}
                                    >
                                        <Component
                                            key={router.asPath}
                                            {...pageProps}
                                            store={store}
                                        />
                                    </PageProvider>
                                </PrismicPreview>
                            </ThemeProvider>
                        </StyleSheetManager>
                    </CartProvider>
                </ShopifyProvider>
            </QueryParamProvider>
        </>
    );
};

export function reportWebVitals({ id, name, value, label }: NextWebVitalsMetric) {
    if (process.env.NODE_ENV !== 'production') return;

    (window as any)?.dataLayer?.push({
        event: 'web-vital',
        event_category: label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
        event_action: name,
        // Google Analytics metrics must be integers, so the value is rounded.
        // For CLS the value is first multiplied by 1000 for greater precision
        // (note: increase the multiplier for greater precision if needed).
        event_value: Math.round(name === 'CLS' ? value * 1000 : value),
        // The 'id' value will be unique to the current page load. When sending
        // multiple values from the same page (e.g. for CLS), Google Analytics can
        // compute a total by grouping on this ID (note: requires `eventLabel` to
        // be a dimension in your report).
        event_label: id
    });
}

export default StoreApp;

import 'destyle.css';
// Global styles
import '@/style/app.scss';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { DefaultSeo, SiteLinksSearchBoxJsonLd, SocialProfileJsonLd } from 'next-seo';
import type { AppProps, NextWebVitalsMetric } from 'next/app';
import Router, { useRouter } from 'next/router';

import { CartFragment } from '@/api/cart';
import { StoreApi } from '@/api/store';
import PageProvider from '@/components/PageProvider';
import { BuildConfig } from '@/utils/build-config';
import { NextLocaleToLocale } from '@/utils/locale';
import { Lexend_Deca } from 'next/font/google';
import Head from 'next/head';
import NProgress from 'nprogress';
import useSWR from 'swr';

const font = Lexend_Deca({
    weight: ['variable' as any],
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
    const locale = NextLocaleToLocale(router.locale);

    const { data: store } = useSWR(
        [
            'StoreApi',
            {
                locale
            }
        ],
        ([, props]) => StoreApi(props),
        {}
    );

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
                :root {
                    --accent-primary: ${store?.accent.primary};
                    --accent-primary-dark: color-mix(in srgb, var(--accent-primary) 65%, var(--color-dark));
                    --accent-primary-light: color-mix(in srgb, var(--accent-primary) 75%, var(--color-bright));
                    --accent-primary-text: #ececec;

                    --accent-secondary: ${store?.accent.secondary};
                    --accent-secondary-dark: color-mix(in srgb, var(--accent-secondary) 65%, var(--color-dark));
                    --accent-secondary-light: color-mix(in srgb, var(--accent-secondary) 35%, var(--color-bright));
                    --accent-secondary-text: #101418;
                }
            `}</style>
            <DefaultSeo themeColor={store?.accent.secondary} />
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content={store?.name} />
                <link rel="icon" type="image/png" href={store?.favicon.src} />
                <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href={store?.favicon.src} />
            </Head>

            {/* TODO: Get this dynamically */}
            <SocialProfileJsonLd
                type="Organization"
                name={store?.name}
                description={store?.description}
                url={`https://${BuildConfig.domain}/`}
                logo={store?.favicon.src}
                foundingDate="2023"
                founders={[
                    {
                        '@type': 'Person',
                        name: 'Dennis Sahlin',
                        email: 'dennis@nordcom.io',
                        jobTitle: 'CEO'
                    },
                    {
                        '@type': 'Person',
                        name: 'Filiph Siitam Sandström',
                        email: 'filiph@nordcom.io',
                        jobTitle: 'CTO'
                    },
                    {
                        '@type': 'Person',
                        name: 'Albin Dahlqvist',
                        email: 'albin@nordcom.io',
                        jobTitle: 'Founder'
                    }
                ]}
                address={{
                    '@type': 'PostalAddress',
                    streetAddress: 'Bergsgatan 7F',
                    addressLocality: 'Mellerud',
                    addressRegion: 'Västra Götaland',
                    postalCode: '464 30',
                    addressCountry: 'Sweden'
                }}
                contactPoint={{
                    '@type': 'ContactPoint',
                    contactType: 'Customer relations and support',
                    email: 'hello@sweetsideofsweden.com',
                    telephone: '+1 866 502 5580',
                    url: `https://${BuildConfig.domain}/about/`,
                    availableLanguage: ['English', 'Swedish'],
                    areaServed:
                        store?.payment?.countries?.map(({ isoCode }) => isoCode) ||
                        router.locales?.filter((i) => i !== 'x-default').map((i) => i.split('-')[1]) ||
                        (router.locale && []) ||
                        undefined
                }}
                sameAs={store?.social?.map(({ url }) => url)}
            />
            <SiteLinksSearchBoxJsonLd
                name={store?.name}
                alternateName={'sweetsideofsweden'}
                url={`https://${BuildConfig.domain}/`}
                potentialActions={[
                    {
                        target: `https://${BuildConfig.domain}/search/?q`,
                        queryInput: 'search_term_string'
                    }
                ]}
            />

            {/* Page */}
            <ShopifyProvider
                storefrontId={BuildConfig.shopify.storefront_id}
                storeDomain={`https://${BuildConfig.shopify.checkout_domain}`}
                storefrontApiVersion={BuildConfig.shopify.api}
                storefrontToken={BuildConfig.shopify.token}
                countryIsoCode={locale.country}
                languageIsoCode={locale.language}
            >
                <CartProvider cartFragment={CartFragment}>
                    <PageProvider store={store} locale={locale} pagePropsAnalyticsData={pageProps.analytics}>
                        <Component key={router.asPath} {...pageProps} store={store} />
                    </PageProvider>
                </CartProvider>
            </ShopifyProvider>
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

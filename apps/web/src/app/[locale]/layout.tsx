import 'destyle.css';
// Global style
import '@/style/app.scss';

import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { NextLocaleToLocale } from '@/utils/locale';
import type { Metadata, Viewport } from 'next';
import { SiteLinksSearchBoxJsonLd, SocialProfileJsonLd } from 'next-seo';
import { notFound } from 'next/navigation';

import { FooterApi } from '@/api/footer';
import { HeaderApi } from '@/api/header';
import { NavigationApi } from '@/api/navigation';
import { StoreApi } from '@/api/store';
import Header from '@/components/Header';
import { MobileMenu } from '@/components/HeaderNavigation/mobile-menu';
import PageContent from '@/components/PageContent';
import PageProvider from '@/components/PageProvider';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import ProvidersRegistry from '@/components/providers-registry';
import { BuildConfig } from '@/utils/build-config';
import { Lexend_Deca } from 'next/font/google';
import type { ReactNode } from 'react';
import { getDictionary } from './dictionary';
import { metadata as notFoundMetadata } from './not-found';

const font = Lexend_Deca({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export async function generateViewport({ params }: { params: { locale: string } }): Promise<Viewport | null> {
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return {};

    const api = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, api });

    return {
        themeColor: store.accent.secondary,
        width: 'device-width',
        initialScale: 1,
        interactiveWidget: 'resizes-visual'
    };
}

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata | null> {
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    const api = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, api });

    return {
        metadataBase: new URL(`https://${BuildConfig.domain}/${locale.locale}/`),
        title: {
            default: store.name,
            // Allow tenants to customize this.
            // For example allow them to use other separators
            // like `·`, `—` etc.
            template: `%s - ${store.name}`
        },
        icons: {
            // TODO: dynamic route(s) for the icons and favicon.
            icon: ['/favicon.png', '/favicon.ico', ...(store.favicon?.src && [store.favicon?.src] || [])],
            shortcut: ['/favicon.png', ...(store.favicon?.src && [store.favicon?.src] || [])],
            apple: ['/favicon.png', ...(store.favicon?.src && [store.favicon?.src] || [])]
        },
        robots: {
            // FIXME: Disable this on staging and development domains.
            follow: true,
            index: true
        },
        referrer: 'origin'
    };
}

export const dynamicParams = true;
export default async function RootLayout(props: { children: ReactNode; params: { locale: string } }) {
    const { children, params } = props;
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);

    const shopifyApi = shopifyApiConfig();

    const store = await StoreApi({ locale, api: StorefrontApiClient({ locale }) });
    const navigation = await NavigationApi({ locale });
    const header = await HeaderApi({ locale });
    const footer = await FooterApi({ locale });

    const headerComponents = (
        <>
            <Header store={store} navigation={navigation} locale={locale} />
            <MobileMenu navigation={navigation} />
        </>
    );

    return (
        <html
            lang={locale.locale}
            style={
                {
                    '--accent-primary': store.accent.primary,
                    '--accent-secondary': store.accent.secondary
                } as React.CSSProperties
            }
        >
            <body className={font.variable}>
                <SocialProfileJsonLd
                    useAppDir
                    type="Organization"
                    name={store.name}
                    description={store.description}
                    url={`https://${BuildConfig.domain}/`}
                    logo={store.favicon?.src || store.logos?.primary?.src}
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
                        availableLanguage: ['English', 'Swedish']
                    }}
                    sameAs={store?.social?.map(({ url }) => url)}
                />
                <SiteLinksSearchBoxJsonLd
                    useAppDir
                    name={store.name}
                    url={`https://${BuildConfig.domain}/`}
                    potentialActions={[
                        {
                            target: `https://${BuildConfig.domain}/search/?q`,
                            queryInput: 'search_term_string'
                        }
                    ]}
                />

                <ProvidersRegistry locale={locale} apiConfig={shopifyApi.public()} store={store}>
                    <PageProvider
                        store={store}
                        locale={locale}
                        i18n={i18n}
                        pagePropsAnalyticsData={{}}
                        data={{ navigation, header, footer }}
                        header={headerComponents}
                    >
                        {children}

                        <PageContent primary>
                            <Breadcrumbs store={store} />
                        </PageContent>
                    </PageProvider>
                </ProvidersRegistry>
            </body>
        </html>
    );
}

export const revalidate = 120; // 2 minutes.

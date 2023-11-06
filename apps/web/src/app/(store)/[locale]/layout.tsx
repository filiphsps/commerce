import 'destyle.css';
// Global style
import '@/style/app.scss';

import { DefaultLocale, NextLocaleToLocale } from '@/utils/locale';
import type { Metadata, Viewport } from 'next';
import { SiteLinksSearchBoxJsonLd, SocialProfileJsonLd } from 'next-seo';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BuildConfig } from '@/utils/build-config';
import { FooterApi } from '@/api/footer';
import { HeaderApi } from '@/api/header';
import { Lexend_Deca } from 'next/font/google';
import { NavigationApi } from '@/api/navigation';
import PageContent from '@/components/PageContent';
import PageProvider from '@/components/PageProvider';
import ProvidersRegistry from '@/components/providers-registry';
import type { ReactNode } from 'react';
import { StoreApi } from '@/api/store';

const font = Lexend_Deca({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export async function generateViewport({ params }: { params: { locale: string } }): Promise<Viewport | null> {
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData) || DefaultLocale();
    const store = await StoreApi({ locale, shopify: StorefrontApiClient({ locale }) });

    return {
        themeColor: store.accent.secondary,
        width: 'device-width',
        initialScale: 1,
        interactiveWidget: 'resizes-visual'
    };
}

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata | null> {
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData) || DefaultLocale();
    const locales = BuildConfig.i18n.locales;

    const store = await StoreApi({ locale, shopify: StorefrontApiClient({ locale }) });

    return {
        metadataBase: new URL(`https://${BuildConfig.domain}/${locale.locale}/`),
        title: {
            default: store.name,
            template: `%s · ${store.name}`
        },
        icons: {
            icon: store.favicon.src,
            shortcut: store.favicon.src,
            apple: store.favicon.src
        },
        robots: {
            follow: true,
            index: true
        },
        alternates: {
            canonical: `https://${BuildConfig.domain}/`,
            languages: locales.reduce(
                (prev, locale) => ({
                    ...prev,
                    [locale]: `https://${BuildConfig.domain}/${locale}/`
                }),
                {}
            )
        },
        referrer: 'origin'
    };
}

// FIXME: We need to enable this to support dynamic locales.
export const dynamicParams = false;
export async function generateStaticParams() {
    return BuildConfig.i18n.locales.map((locale) => ({ locale }));
}

export default async function RootLayout(props: { children: ReactNode; params: { locale: string } }) {
    const { children, params } = props;
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData) || DefaultLocale();

    const shopifyApi = shopifyApiConfig();

    const store = await StoreApi({ locale, shopify: StorefrontApiClient({ locale }) });
    const navigation = await NavigationApi({ locale });
    const header = await HeaderApi({ locale });
    const footer = await FooterApi({ locale });

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
            <head />
            <body className={font.variable}>
                <SocialProfileJsonLd
                    useAppDir
                    type="Organization"
                    name={store.name}
                    description={store.description}
                    url={`https://${BuildConfig.domain}/`}
                    logo={store.favicon.src}
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
                    alternateName={'sweetsideofsweden'}
                    url={`https://${BuildConfig.domain}/`}
                    potentialActions={[
                        {
                            target: `https://${BuildConfig.domain}/search/?q`,
                            queryInput: 'search_term_string'
                        }
                    ]}
                />

                <ProvidersRegistry locale={locale} apiConfig={shopifyApi.public()}>
                    <PageProvider
                        store={store}
                        locale={locale}
                        pagePropsAnalyticsData={{}}
                        data={{ navigation, header, footer }}
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

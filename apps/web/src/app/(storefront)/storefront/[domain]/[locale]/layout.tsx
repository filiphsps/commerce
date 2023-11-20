import '@/styles/app.scss';

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
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { Lexend_Deca } from 'next/font/google';
import type { ReactNode } from 'react';
import { metadata as notFoundMetadata } from './not-found';

const font = Lexend_Deca({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export const runtime = process.env.NODE_ENV === 'production' ? 'experimental-edge' : 'nodejs';

export type LayoutParams = { domain: string; locale: string };

export async function generateViewport({ params }: { params: LayoutParams }): Promise<Viewport> {
    const { domain, locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return {};

    const api = StorefrontApiClient({ domain, locale });
    const store = await StoreApi({ domain, locale, api });

    return {
        themeColor: store.accent.secondary,
        width: 'device-width',
        initialScale: 1,
        interactiveWidget: 'resizes-visual'
    };
}

export async function generateMetadata({ params }: { params: LayoutParams }): Promise<Metadata> {
    const { domain, locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    const api = StorefrontApiClient({ domain, locale });
    const store = await StoreApi({ domain, locale, api });

    return {
        metadataBase: new URL(`https://${domain}/${locale.locale}/`),
        title: {
            default: store.name,
            // Allow tenants to customize this.
            // For example allow them to use other separators
            // like `·`, `—` etc.
            template: `%s - ${store.name}`
        },
        icons: {
            icon: ['/favicon.png', '/favicon.ico'],
            shortcut: ['/favicon.png'],
            apple: ['/favicon.png']
        },
        robots: {
            follow: true,
            index: BuildConfig.environment === 'production' ? true : false
        },
        referrer: 'origin',
        formatDetection: {
            email: false,
            address: false,
            telephone: false
        }
    };
}

export default async function RootLayout({
    children,
    params: { domain, locale: localeData }
}: {
    children: ReactNode;
    params: LayoutParams;
}) {
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();

    try {
        const i18n = await getDictionary(locale);
        const shopifyApi = shopifyApiConfig({ domain });
        const api = StorefrontApiClient({ domain, locale });
        const store = await StoreApi({ domain, locale, api });
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
                suppressHydrationWarning
            >
                <body className={`${font.variable}`}>
                    <SocialProfileJsonLd
                        useAppDir
                        type="Organization"
                        name={store.name}
                        description={store.description}
                        url={`https://${domain}/`}
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
                            url: `https://${domain}/about/`,
                            availableLanguage: ['English', 'Swedish']
                        }}
                        sameAs={store?.social?.map(({ url }) => url)}
                    />
                    <SiteLinksSearchBoxJsonLd
                        useAppDir
                        name={store.name}
                        url={`https://${domain}/`}
                        potentialActions={[
                            {
                                target: `https://${domain}/search/?q`,
                                queryInput: 'search_term_string'
                            }
                        ]}
                    />

                    <ProvidersRegistry locale={locale} apiConfig={shopifyApi.public()} store={store}>
                        <PageProvider
                            store={store}
                            domain={domain}
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
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFound();
        }

        throw error;
    }
}

//export const dynamicParams = true;
export const revalidate = 120; // 2 minutes.

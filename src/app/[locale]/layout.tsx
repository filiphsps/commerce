import 'destyle.css';
// Global style
import '@/style/app.scss';

import * as Prismic from '@/prismic';

import { SiteLinksSearchBoxJsonLd, SocialProfileJsonLd } from 'next-seo';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BuildConfig } from '@/utils/build-config';
import { FooterApi } from '@/api/footer';
import { HeaderApi } from '@/api/header';
import { Lexend_Deca } from 'next/font/google';
import { NavigationApi } from '@/api/navigation';
import { NextLocaleToLocale } from '@/utils/locale';
import PageContent from '@/components/PageContent';
import PageProvider from '@/components/PageProvider';
import { PrismicPreview } from '@prismicio/next';
import ProvidersRegistry from '@/components/providers-registry';
import { StoreApi } from '@/api/store';
import StyledComponentsRegistry from '@/components/styled-components-registry';

const font = Lexend_Deca({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export async function generateMetadata({ params }: { params: { locale: string } }) {
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);
    const locales = BuildConfig.i18n.locales;

    const store = await StoreApi({ locale, shopify: StorefrontApiClient({ locale }) });

    return {
        metadataBase: new URL(`https://${BuildConfig.domain}`),
        title: {
            default: store.name,
            template: `%s | ${store.name}`
        },
        viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
        themeColor: store.accent.secondary,
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
            canonical: `https://${BuildConfig.domain}`,
            languages: locales.reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr]: `https://${BuildConfig.domain}/${curr}/`
                }),
                {}
            )
        }
    };
}

export async function generateStaticParams() {
    return BuildConfig.i18n.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);

    const shopifyApi = shopifyApiConfig();

    const store = await StoreApi({ locale, shopify: StorefrontApiClient({ locale }) });
    const navigation = await NavigationApi({ locale });
    const header = await HeaderApi({ locale });
    const footer = await FooterApi({ locale });

    return (
        <html
            lang={locale.locale}
            className={font.variable}
            style={
                {
                    '--accent-primary': store.accent.primary,
                    '--accent-secondary': store.accent.secondary
                } as React.CSSProperties
            }
        >
            <body>
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
                    <StyledComponentsRegistry>
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
                        <PrismicPreview repositoryName={Prismic.repositoryName} />
                    </StyledComponentsRegistry>
                </ProvidersRegistry>
            </body>
        </html>
    );
}

export const revalidate = 120; // 2 minutes.

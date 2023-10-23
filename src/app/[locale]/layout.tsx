import 'destyle.css';
// Global style
import '@/style/app.scss';

import { SiteLinksSearchBoxJsonLd, SocialProfileJsonLd } from 'next-seo';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { Config } from '@/utils/Config';
import { FooterApi } from '@/api/footer';
import { HeaderApi } from '@/api/header';
import { Lexend_Deca } from 'next/font/google';
import { NavigationApi } from '@/api/navigation';
import { NextLocaleToLocale } from '@/utils/Locale';
import PageContent from '@/components/PageContent';
import PageProvider from '@/components/PageProvider';
import ProvidersRegistry from '@/components/providers-registry';
import { StoreApi } from '@/api/store';
import StyledComponentsRegistry from '@/components/styled-components-registry';

const font = Lexend_Deca({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export async function generateMetadata({ params }: { params: { locale: string } }) {
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);
    const locales = Config.i18n.locales;

    const store = await StoreApi({ locale });

    return {
        metadataBase: new URL(`https://${Config.domain}`),
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
            canonical: `https://${Config.domain}`,
            languages: locales.reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr]: `https://${Config.domain}/${curr}/`
                }),
                {}
            )
        }
    };
}

export async function generateStaticParams() {
    return Config.i18n.locales.map((locale) => ({ locale: locale }));
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

    const store = await StoreApi({ locale });
    const navigation = await NavigationApi({ locale: locale.locale });
    const header = await HeaderApi({ locale: locale.locale });
    const footer = await FooterApi({ locale: locale.locale });

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
                    url={`https://${Config.domain}/`}
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
                        url: `https://${Config.domain}/about/`,
                        availableLanguage: ['English', 'Swedish']
                    }}
                    sameAs={store?.social?.map(({ url }) => url)}
                />
                <SiteLinksSearchBoxJsonLd
                    useAppDir
                    name={store.name}
                    alternateName={'sweetsideofsweden'}
                    url={`https://${Config.domain}/`}
                    potentialActions={[
                        {
                            target: `https://${Config.domain}/search/?q`,
                            queryInput: 'search_term_string'
                        }
                    ]}
                />

                <ProvidersRegistry locale={locale}>
                    <StyledComponentsRegistry>
                        <PageProvider store={store} pagePropsAnalyticsData={{}} data={{ navigation, header, footer }}>
                            {children}
                            <PageContent primary>
                                <Breadcrumbs store={store} />
                            </PageContent>
                        </PageProvider>
                    </StyledComponentsRegistry>
                </ProvidersRegistry>
            </body>
        </html>
    );
}

export const revalidate = 120; // 2 minutes.

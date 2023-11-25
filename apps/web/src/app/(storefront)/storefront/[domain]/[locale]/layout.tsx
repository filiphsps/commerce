import '@/styles/app.scss';

import { ShopifyApolloApiClient, StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { Locale } from '@/utils/locale';
import type { Metadata, Viewport } from 'next';
import { SiteLinksSearchBoxJsonLd, SocialProfileJsonLd } from 'next-seo';
import { notFound } from 'next/navigation';

import { FooterApi } from '@/api/footer';
import { HeaderApi } from '@/api/header';
import { NavigationApi } from '@/api/navigation';
import { ShopApi, type Shop } from '@/api/shop';
import { StoreApi } from '@/api/store';
import { PageProvider } from '@/components/layout/page-provider';
import ProvidersRegistry from '@/components/providers-registry';
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { Error } from '@/utils/errors';
import { Lexend_Deca } from 'next/font/google';
import { type ReactNode } from 'react';
import { metadata as notFoundMetadata } from './not-found';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
/* c8 ignore stop */

// TODO: Generalize this
const getBrandingColors = ({ branding }: Shop['configuration']['design'] = {}) => {
    if (!branding?.colors) return null;
    const { colors } = branding;
    
    // TODO: Deal with variants.
    const primary = colors.find(({ type }) => type === 'primary');
    const secondary = colors.find(({ type }) => type === 'secondary');
    const background = colors.find(({ type }) => type === 'background');

    return {
        primary,
        secondary: secondary || primary,
        background: background || '#fefefe'
    };
};

const font = Lexend_Deca({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export type LayoutParams = { domain: string; locale: string };
export async function generateViewport({
    params: { domain, locale: localeData }
}: {
    params: LayoutParams;
}): Promise<Viewport> {
    try {
        const locale = Locale.from(localeData);
        if (!locale) return {};

        const shop = await ShopApi({ domain });
        const api = await StorefrontApiClient({ shop, locale });

        const store = await StoreApi({ api });
        const branding = getBrandingColors(shop.configuration.design);

        return {
            themeColor: branding?.primary || store.accent.secondary,
            width: 'device-width',
            initialScale: 1,
            interactiveWidget: 'resizes-visual'
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return {
                width: 'device-width',
                initialScale: 1,
                interactiveWidget: 'resizes-visual'
            };
        }

        throw error;
    }
}

export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: LayoutParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);
        if (!locale) return notFoundMetadata;

        const shop = await ShopApi({ domain });
        const api = await StorefrontApiClient({ shop, locale });

        const store = await StoreApi({ api });

        return {
            metadataBase: new URL(`https://${domain}/${locale.code}/`),
            title: {
                default: store.name,
                // Allow tenants to customize this.
                // For example allow them to use other separators
                // like `·`, `—` etc.
                template: `%s - ${store.name}`
            },
            icons: {
                icon: ['/favicon.png'],
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
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export default async function RootLayout({
    children,
    params: { domain, locale: localeData }
}: {
    children: ReactNode;
    params: LayoutParams;
}) {
    try {
        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const shop = await ShopApi({ domain });
        const api = await ShopifyApolloApiClient({ shop, locale });

        const i18n = await getDictionary(locale);

        const navigation = await NavigationApi({ shop, locale });
        const header = await HeaderApi({ shop, locale });
        const footer = await FooterApi({ shop, locale });

        const store = await StoreApi({ api });
        const branding = getBrandingColors(shop.configuration.design);

        return (
            <html
                lang={locale.code}
                className={`${font.variable}`}
                style={
                    {
                        '--color-accent-primary': branding?.primary || store?.accent?.primary,
                        '--color-accent-secondary': branding?.secondary || store?.accent?.secondary,
                        '--color-background': branding?.background, // TODO: Figure out how to deal with dark/light mode.

                        // Legacy.
                        '--accent-primary': branding?.primary || store?.accent?.primary,
                        '--accent-secondary': branding?.secondary || store?.accent?.secondary
                            
                    } as React.CSSProperties
                }
                suppressHydrationWarning
            >
                <head />
                <body>
                    <SocialProfileJsonLd
                        useAppDir
                        type="Organization"
                        name={store.name}
                        description={store.description}
                        url={`https://${domain}/${locale.code}/`}
                        logo={store?.favicon?.src || store.logos?.primary?.src}
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
                            url: `https://${domain}/${locale.code}/about/`,
                            availableLanguage: ['English', 'Swedish']
                        }}
                        sameAs={store?.social?.map(({ url }) => url)}
                    />
                    <SiteLinksSearchBoxJsonLd
                        useAppDir
                        name={store.name}
                        url={`https://${domain}/${locale.code}/`}
                        potentialActions={[
                            {
                                target: `https://${domain}/${locale.code}/search/?q`,
                                queryInput: 'search_term_string'
                            }
                        ]}
                    />

                    <ProvidersRegistry shop={shop} locale={locale} apiConfig={apiConfig.public()} store={store}>
                        <PageProvider
                            shop={shop}
                            store={store}
                            locale={locale}
                            i18n={i18n}
                            data={{ navigation, header, footer }}
                        >
                            {children}
                        </PageProvider>
                    </ProvidersRegistry>
                </body>
            </html>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}

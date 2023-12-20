import '@/styles/app.scss';

import { ShopApi, type Shop } from '@/api/shop';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import { PageProvider } from '@/components/layout/page-provider';
import ProvidersRegistry from '@/components/providers-registry';
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { highlightConfig } from '@/utils/config/highlight';
import { Error } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { HighlightInit } from '@highlight-run/next/client';
import { colord } from 'colord';
import type { Metadata, Viewport } from 'next';
import { Public_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { metadata as notFoundMetadata } from './not-found';

// TODO: Generalize this
const getBrandingColors = async (domain: string) => {
    const shop = await ShopApi({ domain });
    const { colors } = shop.configuration!.design!.branding!;

    // TODO: Deal with variants.
    const primary = colors!.find(({ type }) => type === 'primary')!;
    const secondary = colors!.find(({ type }) => type === 'secondary')!;

    return {
        primary,
        secondary
    };
};

const fontPrimary = Public_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export type LayoutParams = { domain: string; locale: string };
export async function generateViewport({ params: { domain } }: { params: LayoutParams }): Promise<Viewport> {
    try {
        const branding = await getBrandingColors(domain);

        return {
            themeColor: branding.primary.accent as string,
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

export async function generateMetadata({ params: { domain, locale } }: { params: LayoutParams }): Promise<Metadata> {
    try {
        const shop = await ShopApi({ domain });

        return {
            metadataBase: new URL(`https://${domain}/${locale}/`),
            title: {
                default: shop.name,
                // Allow tenants to customize this.
                // For example allow them to use other separators
                // like `·`, `—` etc.
                template: `%s - ${shop.name}`
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

const CssVariablesProvider = async (domain: string) => {
    const branding = await getBrandingColors(domain);

    return <style>{`
        :root {
            --color-background: ${branding.primary.background};
            --color-foreground: ${branding.primary.foreground};
            
            --color-accent-primary: ${branding.primary.accent};
            --color-accent-primary-text: ${branding.primary.foreground};
            --color-accent-primary-light: ${colord(branding.primary.accent).lighten(0.15).toHex()};
            --color-accent-primary-dark: ${colord(branding.primary.accent).darken(0.15).toHex()};
    
            --color-accent-secondary: ${branding.secondary.accent};
            --color-accent-secondary-text: ${branding.secondary.foreground};
            --color-accent-secondary-light: ${colord(store.accent.secondary).lighten(0.15).toHex()};
            --color-accent-secondary-dark: ${colord(store.accent.secondary).darken(0.15).toHex()};
    
            --accent-primary: var(--color-accent-primary);
            --accent-primary-light: var(--color-accent-primary-light);
            --accent-primary-dark: var(--color-accent-primary-dark);
    
            --accent-secondary: var(--color-accent-secondary);
            --accent-secondary-light: var(--color-accent-secondary-light);
            --accent-secondary-dark: var(--color-accent-secondary-dark);
        }
    `}</style>;
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
        const apiConfig = await ShopifyApiConfig({ shop });
        const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });

        const store = await StoreApi({ api });
        const i18n = await getDictionary(locale);

        return (
            <>
                <HighlightInit {...highlightConfig} serviceName={`Nordcom Commerce Storefront`} />
                <html
                    lang={locale.code}
                    className={`${fontPrimary.variable}`}
                >
                    <body>
                        <Suspense key={`${shop.id}.styling`}>
                            <CssVariablesProvider domain={domain} />
                        </Suspense>

                        <Suspense key={`${shop.id}.layout`} fallback={<PageProvider.skeleton />}>
                            <ProvidersRegistry shop={shop} locale={locale} apiConfig={apiConfig.public()} store={store}>
                                <PageProvider shop={shop} locale={locale} i18n={i18n} store={store}>
                                    <Suspense key={`${shop.id}.layout.page`}>
                                        {children}
                                    </Suspense>
                                </PageProvider>
                            </ProvidersRegistry>
                        </Suspense>
                    </body>
                </html>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}

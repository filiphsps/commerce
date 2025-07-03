import '@/styles/app.scss';
import '@/styles/globals.css';

import { View } from '@nordcom/nordstar';

import { cn } from '@/utils/tailwind';
import { GeistMono } from 'geist/font/mono';
import { Montserrat } from 'next/font/google';

import Footer from '@/components/footer';
import Header from '@/components/header';
import { Providers } from '@/components/providers';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const viewport: Viewport = {
    themeColor: '#000000',
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-visual'
};

export const metadata: Metadata = {
    metadataBase: new URL(`https://${(process.env.LANDING_DOMAIN as string) || 'shops.nordcom.io'}/`),
    title: {
        default: 'Headless Commerce as a Service',
        template: `%s · Nordcom Commerce`
    },
    icons: {
        icon: ['/favicon.png', '/favicon.ico'],
        shortcut: ['/favicon.png'],
        apple: ['/favicon.png']
    },
    robots: {
        follow: true,
        index: true
    },
    referrer: 'origin',
    formatDetection: {
        email: false,
        address: false,
        telephone: false
    },
    openGraph: {
        siteName: 'Nordcom Commerce',
        locale: 'en-US'
    }
};

const primaryFont = Montserrat({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export default async function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={cn(primaryFont.className, primaryFont.variable, GeistMono.variable)}>
            <head />
            <body className="grid min-h-screen w-full grid-cols-[100%] grid-rows-[auto_1fr_auto] [grid-template-areas:'header''content''footer']">
                <Providers>
                    <Header />

                    <View className={cn('w-full max-w-[var(--layout-page-width)] [grid-area:content]')}>
                        {children as any}
                    </View>

                    <Footer />
                </Providers>
            </body>
        </html>
    );
}

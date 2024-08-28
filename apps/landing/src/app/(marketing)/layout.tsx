import '@/styles/app.scss';
import styles from './layout.module.scss';

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
    metadataBase: new URL(`https://shops.nordcom.io/`),
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
            <body>
                <Providers>
                    <Header />

                    <View className={styles.content} withoutWrapper={true}>
                        {children}
                    </View>

                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
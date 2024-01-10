import '@/styles/app.scss';

import Footer from '@/components/footer';
import Header from '@/components/header';
import { Providers } from '@/components/providers';
import { View } from '@nordcom/nordstar';
import { GeistMono } from 'geist/font/mono';
import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';
import styles from './layout.module.scss';

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
        <html lang="en" className={`${primaryFont.variable} ${GeistMono.variable}`}>
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

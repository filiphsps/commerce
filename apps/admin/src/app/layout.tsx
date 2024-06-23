import '@/styles/app.scss';

import { Montserrat } from 'next/font/google';

import { GeistMono } from 'geist/font/mono';

import { Providers } from '@/components/providers';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
    themeColor: '#000000',
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-visual'
};

export const metadata: Metadata = {
    metadataBase: new URL(`https://admin.shops.nordcom.io/`),
    title: {
        default: 'admin',
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
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

import './globals.css';

import { primaryFont } from '@/utils/fonts';
import { cn } from '@/utils/tailwind';
import { GeistMono } from 'geist/font/mono';

import { Providers } from '@/components/providers';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
    initialScale: 1,
    interactiveWidget: 'resizes-content',
    themeColor: '#ED1E79',
    width: 'device-width',
    viewportFit: 'cover'
};

export const metadata: Metadata = {
    metadataBase: new URL(`https://${(process.env.ADMIN_DOMAIN as string) || 'admin.shops.nordcom.io'}/`),
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
        follow: false,
        index: false
    },
    referrer: 'origin',
    formatDetection: {
        email: false,
        address: false,
        telephone: false
    }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={cn(primaryFont.className, primaryFont.variable, GeistMono.variable)}>
            <head>
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body className="group/body grid min-h-[100svh] grid-cols-[100%] grid-rows-1 overflow-x-hidden overscroll-x-none font-sans">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

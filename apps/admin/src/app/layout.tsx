import 'the-new-css-reset';
import './globals.css';

import { primaryFont } from '@/utils/fonts';
import { cn } from '@/utils/tailwind';
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
            <head />
            <body className="group/body overflow-x-hidden overscroll-x-none">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

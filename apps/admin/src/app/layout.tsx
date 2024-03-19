import '@/styles/app.scss';

import { Providers } from '@/components/providers';
import { auth } from '@/utils/auth';
import { GeistMono } from 'geist/font/mono';
import { Montserrat } from 'next/font/google';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const session = await auth();

    return (
        <html lang="en" className={`${primaryFont.variable} ${GeistMono.variable}`}>
            <body>
                <Providers session={session}>{children}</Providers>
            </body>
        </html>
    );
}

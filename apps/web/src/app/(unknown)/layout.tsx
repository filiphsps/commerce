import '#/styles/app.scss';

import type { Metadata, Viewport } from 'next';

import { GeistMono } from 'geist/font/mono';
import { Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';

export const viewport: Viewport = {
    themeColor: '#000000',
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-visual'
};

export const metadata: Metadata = {
    title: {
        default: 'error',
        template: `%s · nordcom commerce`
    },
    icons: {
        icon: ['/favicon.png', '/favicon.ico'],
        shortcut: ['/favicon.png'],
        apple: ['/favicon.png']
    },
    robots: {
        follow: true,
        index: false
    },
    referrer: 'origin'
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
        <html lang="en">
            <body className={`${primaryFont.variable} ${GeistMono.variable}`}>{children}</body>
        </html>
    );
}

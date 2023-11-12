import 'destyle.css';
// Global style
import '#/styles/app.scss';

import type { Metadata, Viewport } from 'next';

import { Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';

export async function generateViewport({}): Promise<Viewport> {
    return {
        themeColor: '#000000',
        width: 'device-width',
        initialScale: 1,
        interactiveWidget: 'resizes-visual'
    };
}

export async function generateMetadata({}): Promise<Metadata> {
    return {
        metadataBase: new URL(`https://shops.nordcom.io/`),
        title: {
            absolute: 'nordcom commerce',
            template: `%s · nordcom commerce`
        },
        icons: {
            icon: ['/favicon.png', '/favicon.ico'],
            shortcut: ['/favicon.png'],
            apple: ['/favicon.png']
        },
        robots: {
            follow: true,
            index: false // TODO: Change to true when we have a landing page.
        },
        referrer: 'origin'
    };
}

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
            <body className={`${primaryFont.variable}`}>{children}</body>
        </html>
    );
}

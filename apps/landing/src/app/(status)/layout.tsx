import 'the-new-css-reset';
import '@/styles/app.scss';
import '@/styles/global.css';

import { primaryFont } from '@/utils/fonts';
import { cn } from '@/utils/tailwind';
import { GeistMono } from 'geist/font/mono';

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
    title: {
        default: 'Headless Commerce as a Service',
        template: `%s · Nordcom Commerce`
    },
    icons: {
        icon: ['/favicon.png', '/favicon.ico'],
        shortcut: ['/favicon.png'],
        apple: ['/apple-icon.png']
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
            <body>
                <Providers>
                    <div className="p-4 md:p-8">{children}</div>
                </Providers>
            </body>
        </html>
    );
}

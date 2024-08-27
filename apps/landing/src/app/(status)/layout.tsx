import '@/styles/app.scss';
import '@/styles/global.css';
import 'the-new-css-reset';

import { cn } from '@/utils/tailwind';
import { GeistMono } from 'geist/font/mono';
import { Montserrat } from 'next/font/google';

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
    robots: {
        follow: false,
        index: false
    },
    title: {
        default: 'Headless Commerce as a Service',
        template: `%s · Nordcom Commerce`
    },
    icons: {
        icon: ['/favicon.png'],
        shortcut: ['/favicon.png'],
        apple: ['/apple-icon.png']
    },
    referrer: 'origin',
    formatDetection: {
        email: false,
        address: false,
        telephone: false
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
        <html lang="en" className={cn(primaryFont.variable, GeistMono.variable)}>
            <body>
                <Providers>
                    <div className="p-4 md:p-8">{children}</div>
                </Providers>
            </body>
        </html>
    );
}

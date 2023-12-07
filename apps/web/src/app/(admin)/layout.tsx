import '#/styles/app.scss';

import Footer from '#/components/footer';
import Header from '#/components/header';
import { Providers } from '#/components/providers';
import { authOptions } from '#/utils/auth';
import { HighlightInit } from '@highlight-run/next/client';
import { GeistMono } from 'geist/font/mono';
import type { Metadata, Viewport } from 'next';
import { getServerSession } from 'next-auth/next';
import { Montserrat } from 'next/font/google';
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
    const session = await getServerSession(authOptions);

    return (
        <>
            <HighlightInit
                projectId={process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID}
                serviceName={`Nordcom Commerce Admin`}
                tracingOrigins
                networkRecording={{
                    enabled: true,
                    recordHeadersAndBody: true,
                    urlBlocklist: []
                }}
            />
            <html lang="en">
                <body className={`${primaryFont.variable} ${GeistMono.variable}`}>
                    <Providers session={session}>
                        <Header />
                        {children}
                        <Footer />
                    </Providers>
                </body>
            </html>
        </>
    );
}

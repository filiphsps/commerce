import '#/styles/app.scss';

import Footer from '#/components/footer';
import Header from '#/components/header';
import { Providers } from '#/components/providers';
import { authOptions } from '#/utils/auth';
import { HighlightInit } from '@highlight-run/next/client';
import { View } from '@nordcom/nordstar';
import { GeistMono } from 'geist/font/mono';
import type { Metadata, Viewport } from 'next';
import { getServerSession } from 'next-auth/next';
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
                version={process.env.GIT_COMMIT_SHA || 'dev'}
                serviceName={`Nordcom Commerce Admin`}
                privacySetting="none"
                storageMode="localStorage"
                samplingStrategy={{}}
                inlineStylesheet={true}
                tracingOrigins={true}
                reportConsoleErrors={true}
                enableSegmentIntegration={true}
                enablePerformanceRecording={true}
                networkRecording={{
                    enabled: true,
                    recordHeadersAndBody: true,
                    urlBlocklist: []
                }}
                enableCanvasRecording={false}
                excludedHostnames={['localhost']}
                disableBackgroundRecording={true}
            />
            <html lang="en">
                <body className={`${primaryFont.variable} ${GeistMono.variable}`}>
                    <Providers session={session}>
                        <Header />
                        <View className={styles.content} withoutWrapper={true}>
                            {children}
                        </View>
                        <Footer />
                    </Providers>
                </body>
            </html>
        </>
    );
}

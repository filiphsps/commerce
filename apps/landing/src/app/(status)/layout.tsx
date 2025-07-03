import '@/styles/app.scss';
import '@/styles/globals.css';

import { View } from '@nordcom/nordstar';

import { primaryFont } from '@/utils/fonts';
import { cn } from '@/utils/tailwind';
import { GeistMono } from 'geist/font/mono';
import Image from 'next/image';
import Link from 'next/link';

import Footer from '@/components/footer';
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
            <body className="group/body grid min-h-screen grid-cols-[100%] grid-rows-[auto_1fr_auto] items-center justify-center overflow-x-hidden overscroll-x-none font-sans [grid-template-areas:'header''content''footer']">
                <Providers>
                    <div className="flex h-full w-full grow items-stretch justify-center [grid-area:header]">
                        <View
                            as="header"
                            className="flex w-full items-start justify-start gap-4 overflow-hidden pb-6 pt-3"
                            withoutWrapper={true}
                        >
                            <Link
                                href="https://shops.nordcom.io/"
                                title="Nordcom Commerce"
                                className="w-screen max-w-[80vw] md:w-[24rem]"
                                target="_blank"
                                rel="follow"
                            >
                                <Image
                                    className="h-full w-full object-contain object-left-top"
                                    src="https://nordcom.io/logo.svg"
                                    alt="Nordcom AB's Logo"
                                    height={75}
                                    width={150}
                                    draggable={false}
                                    decoding="async"
                                    priority={true}
                                />
                            </Link>
                        </View>
                    </div>

                    <div className="flex h-full w-full grow items-stretch justify-center [grid-area:content]">
                        <View className="flex h-full w-full flex-col gap-3" withoutWrapper={true}>
                            {children as any}
                        </View>
                    </div>

                    <Footer />
                </Providers>
            </body>
        </html>
    );
}

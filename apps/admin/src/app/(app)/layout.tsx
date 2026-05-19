/**
 * Shell layout for all non-Payload admin routes. Owns the `<html>/<body>` so
 * the root `app/layout.tsx` can stay a passthrough — that lets the `(payload)`
 * route group render Payload's own RootLayout (which emits its own html/body)
 * without nesting two html elements.
 */
import '../globals.css';

import { GeistMono } from 'geist/font/mono';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { primaryFont } from '@/utils/fonts';
import { cn } from '@/utils/tailwind';

export default async function AppShellLayout({ children }: { children: ReactNode }) {
    return (
        // `data-theme="dark"` flips Payload's bundled CSS (input backgrounds,
        // label colors, focus rings, drawer chrome) into its dark variants on
        // first paint. Without it, Payload's `<ThemeProvider>` doesn't set
        // the attribute server-side and the cookie/OS fallback in its
        // useEffect runs too late — fields render with light defaults
        // against our hardcoded-dark color tokens (`globals.css :root`),
        // most visibly hiding input text. Match this with `admin.theme:
        // 'dark'` in `buildPayloadConfig` so the RootProvider agrees.
        <html
            lang="en"
            data-theme="dark"
            className={cn(primaryFont.className, primaryFont.variable, GeistMono.variable)}
        >
            <head>
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body className="group/body grid min-h-svh grid-cols-[100%] grid-rows-1 overflow-x-hidden overscroll-x-none font-sans">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

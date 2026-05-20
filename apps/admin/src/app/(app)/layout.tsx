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
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className="font-sans">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

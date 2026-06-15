import '../globals.css';

import { GeistMono } from 'geist/font/mono';
import type { ReactNode } from 'react';
import { PreviewBanner } from '@/components/preview-banner';
import { Providers } from '@/components/providers';
import { primaryFont } from '@/utils/fonts';
import { cn } from '@/utils/tailwind';

export default async function AppShellLayout({ children }: { children: ReactNode }) {
    return (
        // `data-theme="dark"` pins the dark variant server-side on first
        // paint so fields never flash light defaults against the
        // hardcoded-dark color tokens in `globals.css :root`.
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
                <PreviewBanner />
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

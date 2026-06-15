import '../globals.css';

import { GeistMono } from 'geist/font/mono';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { PreviewBanner } from '@/components/preview-banner';
import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import { primaryFont } from '@/utils/fonts';
import { cn } from '@/utils/tailwind';
import { parseThemePreference, THEME_COOKIE } from '@/utils/theme';

/**
 * Root admin shell layout. Resolves the operator's persisted theme preference from the `admin-theme`
 * cookie and renders a pre-paint {@link ThemeScript} so `<html data-theme>` is correct on the first
 * frame, then hands the preference to the client {@link ThemeProvider} for runtime control.
 *
 * The server default for `data-theme` stays `"dark"` (the only token set that exists today and the
 * correct fallback for `'system'`, which the server cannot resolve); the inline script corrects it to
 * the OS-resolved value before paint, so this is light-ready without a flash.
 *
 * @param props.children - The application subtree.
 * @returns The root HTML document.
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
    const cookieStore = await cookies();
    const preference = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);

    return (
        <html
            lang="en"
            data-theme="dark"
            className={cn(primaryFont.className, primaryFont.variable, GeistMono.variable)}
        >
            <head>
                <ThemeScript />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className="font-sans">
                <ThemeProvider initialPreference={preference}>
                    <PreviewBanner />
                    <Providers>{children}</Providers>
                </ThemeProvider>
            </body>
        </html>
    );
}

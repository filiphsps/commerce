/**
 * Root layout for the admin app. Intentionally a passthrough — the actual
 * `<html>/<body>` shell lives in `(app)/layout.tsx` (regular admin routes)
 * and `(payload)/layout.tsx` (Payload's own RootLayout).
 *
 * Next 16 allows the root layout to skip `<html>/<body>` as long as every
 * top-level route group provides them. That lets Payload's RootLayout render
 * unimpeded — otherwise it would nest its own `<html>` inside ours and break
 * the admin UI.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { ADMIN_URL } from '@/utils/domains';

export const viewport: Viewport = {
    initialScale: 1,
    interactiveWidget: 'resizes-content',
    themeColor: '#ED1E79',
    width: 'device-width',
    viewportFit: 'cover',
};

export const metadata: Metadata = {
    metadataBase: new URL(`${ADMIN_URL}/`),
    title: {
        default: 'admin',
        template: `%s · Nordcom Commerce`,
    },
    icons: {
        icon: ['/favicon.png', '/favicon.ico'],
        shortcut: ['/favicon.png'],
        apple: ['/favicon.png'],
    },
    robots: {
        follow: false,
        index: false,
    },
    referrer: 'origin',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return children;
}

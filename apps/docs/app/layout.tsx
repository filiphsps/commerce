import { Analytics } from '@vercel/analytics/next';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';
import 'fumadocs-ui/style.css';
import './globals.css';
import { Logo } from '@/components/logo';
import { TabChip } from '@/components/tab-chip';
import { Topbar } from '@/components/topbar';
import { docsEnv } from '@/lib/env';
import { primaryFont } from '@/lib/fonts';
import { source } from '@/lib/source';

export const metadata: Metadata = {
    title: { default: 'Nordcom Commerce', template: '%s — Nordcom Commerce' },
    description: 'A multi-tenant, headless e-commerce platform.',
    metadataBase: new URL(docsEnv.canonicalUrl),
    alternates: { canonical: '/' },
    openGraph: {
        title: 'Nordcom Commerce',
        description: 'A multi-tenant, headless e-commerce platform.',
        url: docsEnv.canonicalUrl,
        siteName: 'Nordcom Commerce',
        images: [{ url: '/img/social-card.svg' }],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Nordcom Commerce',
        description: 'A multi-tenant, headless e-commerce platform.',
        images: ['/img/social-card.svg'],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" dir="ltr" suppressHydrationWarning className={`${primaryFont.variable} ${GeistMono.variable}`}>
            <body>
                <RootProvider search={{ options: { type: 'static', api: `${docsEnv.basePath}/api/search` } }}>
                    <DocsLayout
                        tree={source.pageTree}
                        tabMode="navbar"
                        nav={{ title: <Logo height={32} />, mode: 'top', transparentMode: 'top' }}
                        sidebar={{ banner: TabChip }}
                        slots={{ header: Topbar }}
                        tabs={[
                            { title: 'Docs', url: '/' },
                            { title: 'Packages', url: '/packages' },
                            { title: 'Reference', url: '/reference' },
                            { title: 'Errors', url: '/errors' },
                        ]}
                    >
                        {children}
                    </DocsLayout>
                </RootProvider>
                <Analytics />
            </body>
        </html>
    );
}

import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { CmdkPalette } from '@/components/cmdk-palette';
import { docsEnv } from '@/lib/env';

import 'nextra-theme-docs/style.css';
import './globals.css';

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const navbar = <Navbar logo={<strong>Commerce</strong>} projectLink="https://github.com/filiphsps/commerce" />;
    const footer = <Footer>© {new Date().getFullYear()} Nordcom Commerce</Footer>;

    return (
        <html lang="en" dir="ltr" suppressHydrationWarning>
            <Head />
            <body>
                <Layout
                    navbar={navbar}
                    pageMap={await getPageMap()}
                    docsRepositoryBase="https://github.com/filiphsps/commerce/tree/master/apps/docs"
                    footer={footer}
                    sidebar={{ defaultMenuCollapseLevel: 1, autoCollapse: false }}
                >
                    {children}
                </Layout>
                <CmdkPalette />
                <Analytics />
            </body>
        </html>
    );
}

import createNextPluginPreval from '@sweetsideofsweden/next-plugin-preval/config.js';
import dns from 'node:dns';
import { i18n } from './next-i18next.config.cjs';
import manifest from './package.json' assert { type: 'json' };

// See https://github.com/vercel/next.js/issues/44062#issuecomment-1445185361
dns.setDefaultResultOrder('ipv4first');

const withNextPluginPreval = createNextPluginPreval();

/** @type {import('next').NextConfig} */
let config = {
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    i18n,
    productionBrowserSourceMaps: false,
    compress: true,
    experimental: {
        scrollRestoration: true,
        esmExternals: true,
        optimizePackageImports: [
            '@shopify/hydrogen-react',
            'react-icons',
            '@prismicio/client',
            '@prismicio/next',
            '@prismicio/react',
            '@apollo/client'
        ],
        webVitalsAttribution: ['CLS', 'LCP', 'INP'],
    },
    images: {
        minimumCacheTTL: 60 * 6,
        domains: ['cdn.shopify.com', 'images.prismic.io', 'images.unsplash.com', '*.github.io'],
        formats: ['image/avif', 'image/webp']
    },
    compiler: {
        styledComponents: true,
        removeConsole: {
            exclude: ['warn', 'error'],
        },
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    devIndicators: {
        buildActivityPosition: 'bottom-right',
    },
    env: {
        // Settings
        DOMAIN: process.env.DOMAIN,
        SHOPIFY_DOMAIN: process.env.SHOPIFY_DOMAIN,
        SHOPIFY_TOKEN: process.env.SHOPIFY_TOKEN,
        PRISMIC_REPO: process.env.PRISMIC_REPO,
        PRISMIC_TOKEN: process.env.PRISMIC_TOKEN,
        STORE_LOCALES: process.env.STORE_LOCALES,
        STORE_CURRENCIES: process.env.STORE_CURRENCIES,
        GTM: process.env.GTM,

        // Colors
        ACCENT_PRIMARY: process.env.ACCENT_PRIMARY,
        ACCENT_SECONDARY: process.env.ACCENT_SECONDARY,

        VERSION: manifest.version
    },

    async redirects() {
        return [
            {
                source: '/x-default/:slug*',
                destination: '/:slug',
                permanent: true
            },
            {
                source: '/blogs/news/:slug*',
                destination: '/blog/:slug',
                permanent: true
            },
            {
                source: '/admin/',
                destination: `https://${process.env.SHOPIFY_DOMAIN}/admin`,
                permanent: true
            },
            {
                source: '/products/',
                destination: '/shop/',
                permanent: true
            },
            {
                source: '/shop/',
                destination: '/collections/bestselling/',
                permanent: true
            }
        ];
    },

    async headers() {
        return [
            {
                // Sets security headers for all routes
                source: '/(.*)',
                headers: [
                    {
                        key: 'Referrer-Policy',
                        value: 'no-referrer-when-downgrade'
                    }
                ]
            }
        ];
    }
};

export default withNextPluginPreval(config);

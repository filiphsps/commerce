import { withHighlightConfig } from '@highlight-run/next/config';
import createNextPluginPreval from '@sweetsideofsweden/next-plugin-preval/config.js';
import { i18n } from './next-i18next.config.cjs';

const withNextPluginPreval = createNextPluginPreval();

/** @type {import('next').NextConfig} */
let config = {
    i18n,

    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: [],
    experimental: {
        appDocumentPreloading: true,
        esmExternals: true,
        //fallbackNodePolyfills: false, // We rely on `process.env`.
        gzipSize: true,
        instrumentationHook: true,
        optimisticClientCache: true,
        optimizeCss: true,
        optimizePackageImports: [
            '@apollo/client',
            '@prismicio/client',
            '@prismicio/next',
            '@prismicio/react',
            '@shopify/hydrogen-react',
            'react-icons'
        ],
        optimizeServerReact: true,
        scrollRestoration: true,
        serverComponentsExternalPackages: [],
        turbo: {
            resolveAlias: {
                '@/styles/': './src/scss/'
            }
        },
        webpackBuildWorker: true,
        webVitalsAttribution: ['CLS', 'LCP', 'INP'],
        windowHistorySupport: true
    },
    images: {
        //loader: 'custom',
        //loaderFile: './src/utils/image-loader.ts',
        dangerouslyAllowSVG: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'nordcom.io'
            },
            {
                protocol: 'https',
                hostname: '**.nordcom.io'
            },
            {
                protocol: 'https',
                hostname: '**.prismic.io'
            },
            {
                protocol: 'https',
                hostname: '**.unsplash.com'
            },
            {
                protocol: 'https',
                hostname: '**.shopify.com'
            },
            {
                protocol: 'https',
                hostname: '**.github.io'
            },
            {
                protocol: 'https',
                hostname: '**.gravatar.com'
            }
        ],
        formats: ['image/webp', 'image/avif']
    },
    compiler: {
        styledComponents: true
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    env: {
        // Settings
        DOMAIN: process.env.DOMAIN,
        STORE_LOCALES: process.env.STORE_LOCALES,
        STORE_DEFAULT_LOCALE: process.env.STORE_DEFAULT_LOCALE,
        STORE_CURRENCIES: process.env.STORE_CURRENCIES,
        GTM: process.env.GTM,

        // Shopify
        SHOPIFY_SHOP_ID: process.env.SHOPIFY_SHOP_ID,
        SHOPIFY_STOREFRONT_ID: process.env.SHOPIFY_STOREFRONT_ID,
        SHOPIFY_DOMAIN: process.env.SHOPIFY_DOMAIN,
        SHOPIFY_CHECKOUT_DOMAIN: process.env.SHOPIFY_CHECKOUT_DOMAIN,
        SHOPIFY_TOKEN: process.env.SHOPIFY_TOKEN,

        // Prismic
        PRISMIC_REPO: process.env.PRISMIC_REPO,
    },
    serverRuntimeConfig: {
        // Prismic
        PRISMIC_TOKEN: process.env.PRISMIC_TOKEN,

        // Shopify.
        SHOPIFY_PRIVATE_TOKEN: process.env.SHOPIFY_PRIVATE_TOKEN,
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
                source: '/:lang/admin/',
                destination: `https://checkout.sweetsideofsweden.com/admin`,
                permanent: true
            },
            {
                source: '/:lang/admin/:slug*',
                destination: `https://checkout.sweetsideofsweden.com/admin`,
                permanent: true
            },
            {
                source: '/admin/:slug*',
                destination: `https://checkout.sweetsideofsweden.com/admin`,
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
                permanent: false
            }
        ];
    }
};

export default withNextPluginPreval(await withHighlightConfig(config, {
    apiKey: process.env.HIGHLIGHT_SOURCEMAP_UPLOAD_API_KEY,
    appVersion: process.env.VERCEL_GIT_COMMIT_SHA,
}));

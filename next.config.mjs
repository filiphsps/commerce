import createNextPluginPreval from '@sweetsideofsweden/next-plugin-preval/config.js';
import { i18n } from './next-i18next.config.cjs';

const withNextPluginPreval = createNextPluginPreval();

/** @type {import('next').NextConfig} */
let config = {
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
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
        ...(process.env.NODE_ENV === 'production' && {
            removeConsole: {
                exclude: ['warn', 'error'],
            }
        } || {})
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
    },
    webpack(config, { webpack }) {
        config.plugins.push(
            new webpack.DefinePlugin({
                "globalThis.__DEV__": false,
            })
        );
        return config;
    },

    async rewrites() {
        return [{
            source: '/:lang/beta/:slug*',
            destination: 'https://staging.sweetsideofsweden.com/:lang/:slug*'
        }];
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

export default withNextPluginPreval(config);

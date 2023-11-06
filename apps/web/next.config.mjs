/** @type {import('next').NextConfig} */
const config = {
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    productionBrowserSourceMaps: true,
    compress: true,
    experimental: {
        esmExternals: true,
        optimizePackageImports: [
            '@apollo/client',
            '@prismicio/client',
            '@prismicio/next',
            '@prismicio/react',
            '@shopify/hydrogen-react',
            'react-icons',
        ],
        scrollRestoration: true,
        webVitalsAttribution: ['CLS', 'LCP', 'INP']
    },
    images: {
        remotePatterns: [
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
            }
        ],
        formats: ['image/webp', 'image/avif']
    },
    compiler: {
        styledComponents: true,
        ...((process.env.NODE_ENV === 'production' && {
            removeConsole: {
                exclude: ['warn', 'error']
            }
        }) ||
            {})
    },
    eslint: {
        ignoreDuringBuilds: true
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
        PRISMIC_REPO: process.env.PRISMIC_REPO
    },
    serverRuntimeConfig: {
        // Shopify
        SHOPIFY_PRIVATE_TOKEN: process.env.SHOPIFY_PRIVATE_TOKEN,

        // Prismic
        PRISMIC_TOKEN: process.env.PRISMIC_TOKEN
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
                permanent: false
            }
        ];
    }
};

export default config;

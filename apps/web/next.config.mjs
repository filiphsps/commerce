import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

//import { createRequire } from 'node:module';
//const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const config = {
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
            },
            {
                protocol: 'https',
                hostname: '**.gravatar.com'
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
    sassOptions: {
        includePaths: [path.join(__dirname, 'src/scss'), path.join(__dirname, 'src')],
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
        // Shopify
        SHOPIFY_PRIVATE_TOKEN: process.env.SHOPIFY_PRIVATE_TOKEN,

        // Prismic
        PRISMIC_TOKEN: process.env.PRISMIC_TOKEN,
    },
    async redirects() {
        return [
            // TODO: Point these to the multi-tenant admin app once that is built.
            {
                source: '/:locale/admin/',
                destination: `https://${process.env.SHOPIFY_DOMAIN}/admin`,
                permanent: false
            },
            {
                source: '/admin/',
                destination: `https://${process.env.SHOPIFY_DOMAIN}/admin`,
                permanent: false
            }
        ];
    },

    // While I wish we could use this we must handle it
    // ourselves as a part of the locale redirection.
    // This is due to the limited amount of redirects
    // we're allowed to use if we want to be on the HSTS
    // preload list.
    skipTrailingSlashRedirect: true,
};

export default config;

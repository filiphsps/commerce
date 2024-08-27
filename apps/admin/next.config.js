import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV !== 'development' ? true : false; // Deliberately using a ternary here for clarity.

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    trailingSlash: false, // FIXME: https://github.com/nextauthjs/next-auth/issues/10127
    productionBrowserSourceMaps: true,
    compress: true,
    skipTrailingSlashRedirect: false,
    trailingSlash: true,
    transpilePackages: [],
    experimental: {
        //nextScriptWorkers: true,
        //ppr: true,
        caseSensitiveRoutes: true,
        optimizeCss: true,
        optimizePackageImports: ['react-icons', '@nordcom/nordstar'],
        scrollRestoration: true,
        serverSourceMaps: true,
        serverMinification: true,
        taint: true,
        webpackBuildWorker: true,
        parallelServerBuildTraces: true
    },
    images: {
        dangerouslyAllowSVG: true,
        //path: 'https://cloudflare-image.nordcom.workers.dev', // Shopify images fails when using .nordcom.io domain.
        //minimumCacheTTL: 60,
        contentDispositionType: 'inline',
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
    eslint: {
        ignoreDuringBuilds: true
    },
    sassOptions: {
        includePaths: [path.join(__dirname, 'src/scss'), path.join(__dirname, 'src')]
    },

    env: {
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        AUTH_URL: process.env.AUTH_URL
    },
    serverRuntimeConfig: {
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        AUTH_URL: process.env.AUTH_URL,
        AUTH_SECRET: process.env.AUTH_SECRET || 'development-secret-change-me',
        SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
        SHOPIFY_API_SECRET_KEY: process.env.SHOPIFY_API_SECRET_KEY
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    },

    webpack(config) {
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true
        };
        return config;
    }
};

export default config;

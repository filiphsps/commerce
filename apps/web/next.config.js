import { withHighlightConfig } from '@highlight-run/next/config';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    generateEtags: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: [],
    experimental: {
        caseSensitiveRoutes: true,
        instrumentationHook: true,
        //nextScriptWorkers: true,
        optimizeCss: true,
        optimizePackageImports: [
            '@apollo/client',
            '@nordcom/nordstar',
            '@prismicio/client',
            '@prismicio/next',
            '@prismicio/react',
            '@shopify/hydrogen-react',
            'react-icons'
        ],
        //ppr: true,
        scrollRestoration: true,
        serverComponentsExternalPackages: ['@highlight-run/node'],
        serverSourceMaps: true,
        serverMinification: false,
        //taint: true,
        webpackBuildWorker: true
    },
    images: {
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
    eslint: {
        ignoreDuringBuilds: true
    },
    sassOptions: {
        includePaths: [path.join(__dirname, 'src/scss'), path.join(__dirname, 'src')]
    },

    env: {
        // Settings.
        LIMIT_STATIC_PAGES: process.env.LIMIT_STATIC_PAGES || '',

        // Prismic.
        PRISMIC_REPO: process.env.PRISMIC_REPO,

        // Misc.
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    },
    serverRuntimeConfig: {
        // Database.
        POSTGRES_PRISMA_ACCELERATE_URL: process.env.POSTGRES_PRISMA_ACCELERATE_URL,

        // Settings.
        LIMIT_STATIC_PAGES: process.env.LIMIT_STATIC_PAGES || '',

        // Prismic.
        PRISMIC_TOKEN: process.env.PRISMIC_TOKEN,

        // Highlight.
        HIGHLIGHT_SOURCEMAP_UPLOAD_API_KEY: process.env.HIGHLIGHT_SOURCEMAP_UPLOAD_API_KEY,

        // Misc.
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    },

    // Let us handle trailing slashes in the middleware instead.
    skipTrailingSlashRedirect: true
};

export default withHighlightConfig(config, {
    apiKey: process.env.HIGHLIGHT_SOURCEMAP_UPLOAD_API_KEY,
    appVersion: process.env.VERCEL_GIT_COMMIT_SHA,
    uploadSourceMaps: !!process.env.VERCEL_ENV,
    sourceMapsBasePath: './apps/web/'
});

import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import withMillionLint from '@million/lint';
import withMillion from 'million/compiler';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
    basePath: '/admin',
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: [],
    experimental: {
        caseSensitiveRoutes: true,
        instrumentationHook: process.env.NODE_ENV !== 'development' ? true : false, // Deliberately using a ternary here for clarity.
        //nextScriptWorkers: true,
        optimizeCss: true,
        optimizePackageImports: ['react-icons', '@nordcom/nordstar'],
        //ppr: true,
        scrollRestoration: true,
        serverComponentsExternalPackages: [],
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
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    },
    serverRuntimeConfig: {
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    },

    skipTrailingSlashRedirect: true
};

export default withMillionLint.next({ rsc: true })(withMillion.next(config), {});

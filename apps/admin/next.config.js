import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import withMillionLint from '@million/lint';
import withMillion from 'million/compiler';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: false, // FIXME: https://github.com/nextauthjs/next-auth/issues/10127
    swcMinify: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: [],
    experimental: {
        esmExternals: 'loose',
        caseSensitiveRoutes: true,
        //nextScriptWorkers: true,
        optimizeCss: true,
        optimizePackageImports: ['react-icons'],
        //ppr: true,
        scrollRestoration: true,
        serverComponentsExternalPackages: ['mongoose'],
        serverSourceMaps: true,
        serverMinification: false,
        taint: true,
        webpackBuildWorker: false,
        parallelServerBuildTraces: false
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

export default withMillionLint.next({ rsc: true })(
    withMillion.next(config, {
        telemetry: false
    })
);

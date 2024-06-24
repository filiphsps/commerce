import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import createWithBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withBundleAnalyzer = createWithBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true'
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV !== 'development' ? true : false; // Deliberately using a ternary here for clarity.

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    trailingSlash: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: ['@shopify/hydrogen-react'],
    serverExternalPackages: ['@sentry/profiling-node', '@nordcom/commerce-db', 'mongoose'],
    experimental: {
        ppr: true,
        //caseSensitiveRoutes: true,
        instrumentationHook: isProduction,
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
        scrollRestoration: true,
        serverSourceMaps: true,
        serverMinification: isProduction,
        webpackBuildWorker: true,
        parallelServerBuildTraces: true,
        parallelServerCompiles: true,
        reactCompiler: true,
        turbo: {}
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

    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Document-Policy',
                        value: 'js-profiling'
                    }
                ]
            }
        ];
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    },

    webpack(config, context) {
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true
        };

        if (context.isServer) config.devtool = 'source-map';
        return config;
    },

    // We handle all redirects at the edge.
    skipTrailingSlashRedirect: true
};

export default withSentryConfig(withBundleAnalyzer(config), {
    org: 'nordcom',
    project: 'commerce',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true
});

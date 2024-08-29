import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import createWithBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import createVercelToolbar from '@vercel/toolbar/plugins/next';

const withVercelToolbar = createVercelToolbar();

const withBundleAnalyzer = createWithBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true'
});

const __dirname = dirname(fileURLToPath(import.meta.url));
//const isProduction = process.env.NODE_ENV !== 'development' ? true : false; // Deliberately using a ternary here for clarity.

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    trailingSlash: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: ['@shopify/hydrogen-react', '@prismicio/client', '@slicemachine/adapter-next'],
    serverExternalPackages: ['@sentry/profiling-node', '@nordcom/commerce-db', 'mongoose'],
    devIndicators: {
        buildActivity: true,
        appIsrStatus: true
    },
    experimental: {
        //caseSensitiveRoutes: true,
        cssChunking: 'loose',
        optimizeCss: true,
        optimizePackageImports: ['@apollo/client', '@shopify/hydrogen-react', 'react-icons'],
        parallelServerBuildTraces: true,
        parallelServerCompiles: true,
        ppr: true,
        reactCompiler: true,
        scrollRestoration: true,
        serverSourceMaps: true,
        turbo: {},
        taint: true,
        webpackBuildWorker: true
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
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    },

    async headers() {
        return ['/', '/:path*'].map((source) => ({
            source,
            headers: [
                {
                    key: 'X-Powered-By',
                    value: 'Nordcom Commerce (shops.nordcom.io)'
                }
            ]
        }));
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    },

    webpack: (config, { webpack, isServer }) => {
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true
        };

        config.plugins.push(
            new webpack.DefinePlugin({
                __SENTRY_DEBUG__: false,
                __SENTRY_TRACING__: false,
                __RRWEB_EXCLUDE_IFRAME__: true,
                __RRWEB_EXCLUDE_SHADOW_DOM__: true,
                __SENTRY_EXCLUDE_REPLAY_WORKER__: true
            })
        );

        if (isServer) {
            config.devtool = 'source-map';
        }
        return config;
    },

    // We handle all redirects at the edge.
    skipTrailingSlashRedirect: true
};

export default withSentryConfig(withBundleAnalyzer(withVercelToolbar(config)), {
    org: 'nordcom',
    project: 'commerce',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    debug: process.env.NODE_ENV === 'development',
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
    transpileClientSDK: false
    //tunnelRoute: "/monitoring",
});

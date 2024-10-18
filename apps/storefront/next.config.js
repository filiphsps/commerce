import 'dotenv/config';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { withSentryConfig } from '@sentry/nextjs';
import createVercelToolbar from '@vercel/toolbar/plugins/next';

import { createRequire } from 'node:module';

const withVercelToolbar = createVercelToolbar();

const isDev = process.env.NODE_ENV === 'development';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

const data_cache_url = process.env.DATA_CACHE_REDIS_URL || undefined;
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const config = {
    cacheHandler: !isDev && data_cache_url ? require.resolve('./data-cache-handler.mjs') : undefined,
    cacheMaxMemorySize: !isDev && data_cache_url ? 0 : undefined,
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    trailingSlash: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: ['@shopify/hydrogen-react', '@prismicio/client', '@slicemachine/adapter-next'],
    serverExternalPackages: ['crypto-js'],
    devIndicators: {
        buildActivity: true,
        appIsrStatus: true
    },
    experimental: {
        after: true,
        appNavFailHandling: true,
        cssChunking: 'loose',
        esmExternals: true,
        middlewarePrefetch: 'strict',
        optimizeCss: true,
        optimizePackageImports: ['@apollo/client', '@shopify/hydrogen-react', 'react-icons', '@nordcom/nordstar'],
        optimizeServerReact: true,
        parallelServerBuildTraces: true,
        parallelServerCompiles: true,
        ppr: true,
        reactCompiler: true,
        scrollRestoration: true,
        serverComponentsHmrCache: true,
        serverSourceMaps: true,
        staleTimes: { dynamic: 0, static: 180 },
        taint: true,
        turbo: { root: path.resolve('../..') },
        typedEnv: true,
        useEarlyImport: true,
        webpackBuildWorker: true
    },
    images: {
        dangerouslyAllowSVG: true,
        //path: 'https://cloudflare-image.nordcom.workers.dev',
        minimumCacheTTL: 60,
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
    typescript: {
        ignoreBuildErrors: true,
        tsconfigPath: 'tsconfig.json'
    },
    sassOptions: {
        includePaths: [path.join(__dirname, 'src/scss'), path.join(__dirname, 'src')]
    },

    env: {
        ENVIRONMENT: environment,
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA
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

        if (isDev) {
            return config; // Return early in dev mode.
        }

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

/**
 *
 * @param {import('next').NextConfig} config
 * @returns
 */
const wrapConfig = (config) => {
    // Always include vercel toolbar.
    config = withVercelToolbar(config);

    if (isDev) {
        console.warn('Development mode detected, skipping Sentry...');
        return config;
    }

    return withSentryConfig(config, {
        org: 'nordcom',
        project: 'commerce',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: true,
        debug: isDev,
        widenClientFileUpload: true,
        hideSourceMaps: true,
        disableLogger: true,
        automaticVercelMonitors: true,
        transpileClientSDK: false,
        unstable_sentryWebpackPluginOptions: {
            bundleSizeOptimizations: {
                excludeDebugStatements: true,
                excludePerformanceMonitoring: true,
                excludeReplayShadowDom: true,
                excludeReplayIframe: true,
                excludeReplayWorker: true
            }
        }
    });
};

export default wrapConfig(config);

import 'dotenv/config';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createVercelToolbar from '@vercel/toolbar/plugins/next';

const withVercelToolbar = createVercelToolbar();

const isDev = process.env.NODE_ENV === 'development';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    trailingSlash: true,
    productionBrowserSourceMaps: true,
    compress: true,
    reactCompiler: true,
    cacheComponents: true,
    transpilePackages: ['@shopify/hydrogen-react'],
    serverExternalPackages: ['crypto-js'],
    turbopack: { root: path.resolve(path.join(__dirname, '../..')) },
    devIndicators: {
        buildActivity: true,
        appIsrStatus: true,
    },
    experimental: {
        appNavFailHandling: true,
        cssChunking: true,
        esmExternals: true,
        proxyPrefetch: 'strict',
        optimizeCss: true,
        optimizePackageImports: ['@apollo/client', '@shopify/hydrogen-react', '@nordcom/nordstar'],
        optimizeServerReact: true,
        parallelServerBuildTraces: true,
        parallelServerCompiles: true,
        prerenderEarlyExit: true,
        scrollRestoration: true,
        serverComponentsHmrCache: true,
        serverSourceMaps: true,
        staleTimes: { dynamic: 0, static: 180 },
        taint: true,
        typedEnv: true,
        webpackBuildWorker: true,
        rootParams: true,
    },
    images: {
        unoptimized: true, // FIXME: We should optimize images.
        dangerouslyAllowSVG: true,
        //path: 'https://cloudflare-image.nordcom.workers.dev',
        minimumCacheTTL: 60,
        contentDispositionType: 'inline',
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*', // FIXME: Wildcard is a bad idea.
            },
            {
                protocol: 'https',
                hostname: 'nordcom.io',
            },
            {
                protocol: 'https',
                hostname: '**.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: '**.shopify.com',
            },
            {
                protocol: 'https',
                hostname: '**.github.io',
            },
            {
                protocol: 'https',
                hostname: '**.gravatar.com',
            },
            // FIXME: Allow SERVICE_DOMAIN.
        ],
        formats: ['image/webp', 'image/avif'],
    },
    typescript: {
        ignoreBuildErrors: true,
        tsconfigPath: 'tsconfig.json',
    },
    sassOptions: {
        loadPaths: [path.join(__dirname, 'src/scss'), path.join(__dirname, 'src')],
    },

    env: {
        ENVIRONMENT: environment,
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    },

    async headers() {
        return ['/', '/:path*'].map((source) => ({
            source,
            headers: [
                {
                    key: 'X-Powered-By',
                    value: `Nordcom Commerce (${process.env.SERVICE_DOMAIN || 'unknown'})`,
                },
            ],
        }));
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    },

    webpack: (config, { webpack, isServer }) => {
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
        };

        if (isDev) {
            return config; // Return early in dev mode.
        }

        config.plugins.push(
            new webpack.DefinePlugin({
                __RRWEB_EXCLUDE_IFRAME__: true,
                __RRWEB_EXCLUDE_SHADOW_DOM__: true,
            }),
        );

        if (isServer) {
            config.devtool = 'source-map';
        }
        return config;
    },

    // We handle all redirects at the edge.
    skipTrailingSlashRedirect: true,
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
        console.warn('Development mode detected, skipping logging...');
        return config;
    }

    return config;
};

export default wrapConfig(config);

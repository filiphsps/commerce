import 'dotenv/config';

import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import createVercelToolbar from '@vercel/toolbar/plugins/next';

const withVercelToolbar = createVercelToolbar({
    devServerPort: 1337
});

const isDev = process.env.NODE_ENV === 'development';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getBaseUrl() {
    if (process.env.VERCEL_ENV === 'production') {
        return 'https://admin.shops.nordcom.io';
    }

    return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
}

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
    assetPrefix: getBaseUrl(),
    experimental: {
        after: true,
        appNavFailHandling: true,
        caseSensitiveRoutes: true,
        cssChunking: 'loose',
        esmExternals: true,
        middlewarePrefetch: 'flexible',
        optimizeCss: true,
        optimizePackageImports: ['@apollo/client', '@shopify/hydrogen-react'],
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
        typedRoutes: true,
        useEarlyImport: true,
        useWasmBinary: false,
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
    typescript: {
        ignoreBuildErrors: true,
        tsconfigPath: 'tsconfig.json'
    },
    sassOptions: {
        includePaths: [path.join(__dirname, 'src/scss'), path.join(__dirname, 'src')]
    },

    env: {
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
        AUTH_URL: process.env.AUTH_URL
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    },

    webpack: !isDev
        ? (config, { webpack, isServer }) => {
              config.experiments = {
                  ...config.experiments,
                  topLevelAwait: true
              };

              if (isServer) {
                  config.devtool = 'source-map';
              }
              return config;
          }
        : undefined,

    // We handle all redirects at the edge.
    skipTrailingSlashRedirect: true
};

export default withVercelToolbar(config);

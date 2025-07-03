import 'dotenv/config';

import { execSync } from 'node:child_process';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import withMarkdoc from '@markdoc/next.js';
import createVercelToolbar from '@vercel/toolbar/plugins/next';

const withVercelToolbar = createVercelToolbar();

const isDev = process.env.NODE_ENV === 'development';
let gitSHA = process.env.GIT_COMMIT_SHA;
if (!gitSHA) {
    try {
        gitSHA = execSync('git rev-parse HEAD').toString().trim();
    } catch {}
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getBaseUrl() {
    if (process.env.VERCEL_ENV === 'production') {
        return 'https://shops.nordcom.io';
    }

    return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
}

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    trailingSlash: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: [],
    assetPrefix: getBaseUrl(),
    turbopack: { root: path.resolve('../..') },
    experimental: {
        appNavFailHandling: true,
        cssChunking: true,
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
        typedEnv: true,
        typedRoutes: false,
        webpackBuildWorker: true
    },
    images: {
        dangerouslyAllowSVG: true,
        //path: 'https://cloudflare-image.nordcom.workers.dev', // Shopify images fails when using .nordcom.io domain.
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
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: gitSHA
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') {
            return 'dev';
        }

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

export default withMarkdoc({
    mode: 'static',
    schemaPath: './src/markdoc',
    tokenizerOptions: {
        allowComments: true,
        slots: true
    }
})(withVercelToolbar(config));

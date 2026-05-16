import 'dotenv/config';

import { execSync } from 'node:child_process';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import withMarkdoc from '@markdoc/next.js';
import createVercelToolbar from '@vercel/toolbar/plugins/next';

const withVercelToolbar = createVercelToolbar();

// TODO: Create util instead of duplicating it thrice.
const isDev = [process.env.NODE_ENV, process.env.VERCEL_ENV].includes('development');
const environment = process.env.VERCEL_ENV === 'preview' ? 'preview' : isDev ? 'development' : 'production';
let gitSHA = process.env.GIT_COMMIT_SHA;
if (!gitSHA) {
    try {
        gitSHA = execSync('git rev-parse HEAD').toString().trim() || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    } catch {}
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getBaseUrl() {
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
    reactCompiler: true,
    cacheComponents: true,
    turbopack: { root: path.resolve(path.join(__dirname, '../..')) },
    experimental: {
        appNavFailHandling: true,
        cssChunking: 'strict',
        proxyPrefetch: 'strict',
        optimizeCss: true,
        optimizePackageImports: ['@apollo/client', '@shopify/hydrogen-react', 'react-icons', '@nordcom/nordstar'],
        optimizeServerReact: true,
        parallelServerBuildTraces: true,
        parallelServerCompiles: true,
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
        dangerouslyAllowSVG: true,
        minimumCacheTTL: 60,
        contentDispositionType: 'inline',
        remotePatterns: [
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

    env: {
        ENVIRONMENT: environment,
        GIT_COMMIT_SHA: gitSHA,
    },
    async generateBuildId() {
        if (isDev) {
            return 'dev';
        }

        return gitSHA;
    },

    // We handle all redirects at the edge.
    skipTrailingSlashRedirect: true,
};

export default withMarkdoc({
    mode: 'static',
    schemaPath: './src/markdoc',
    tokenizerOptions: {
        allowComments: true,
        slots: true,
    },
})(withVercelToolbar(config));

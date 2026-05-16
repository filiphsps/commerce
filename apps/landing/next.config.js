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

const imageRemotePatterns = [
    { protocol: 'https', hostname: '**.unsplash.com' },
    { protocol: 'https', hostname: '**.shopify.com' },
    { protocol: 'https', hostname: '**.github.io' },
    { protocol: 'https', hostname: '**.gravatar.com' },
];

const SERVICE_DOMAIN = process.env.SERVICE_DOMAIN || undefined;
const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || undefined;
const LANDING_DOMAIN = process.env.LANDING_DOMAIN || undefined;

if (SERVICE_DOMAIN) {
    imageRemotePatterns.unshift({ protocol: 'https', hostname: SERVICE_DOMAIN });
}
if (LANDING_DOMAIN) {
    imageRemotePatterns.unshift({ protocol: 'https', hostname: LANDING_DOMAIN });
}
if (ADMIN_DOMAIN) {
    imageRemotePatterns.unshift({ protocol: 'https', hostname: ADMIN_DOMAIN });
}

export function getBaseUrl() {
    // Make sure that we're actually on vercel.
    if (!process.env.VERCEL_ENV) {
        return undefined;
    }

    // TODO: Add branch deployments etc that should take president over the production url.
    const targetUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || undefined;
    if (!targetUrl) {
        return undefined;
    }

    return `https://${targetUrl}`;
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

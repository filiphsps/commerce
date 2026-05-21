import 'dotenv/config';

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// TODO: Create util instead of duplicating it thrice.
const isDev = [process.env.NODE_ENV, process.env.VERCEL_ENV].includes('development');
const environment = process.env.VERCEL_ENV === 'preview' ? 'preview' : isDev ? 'development' : 'production';
let gitSHA = process.env.GIT_COMMIT_SHA;
if (!gitSHA) {
    try {
        gitSHA = execSync('git rev-parse HEAD').toString().trim() || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    } catch {}
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    allowedDevOrigins: ['storefront.localhost', '*.storefront.localhost', 'localhost'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    trailingSlash: true,
    productionBrowserSourceMaps: true,
    compress: !isDev,
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
        appNewScrollHandler: true,
        authInterrupts: true,
        cssChunking: true,
        dynamicOnHover: true,
        esmExternals: true,
        mcpServer: false, // TODO: Enable when we can have multiple mcp servers.
        optimizeCss: !isDev,
        optimizePackageImports: ['@apollo/client', '@shopify/hydrogen-react', '@nordcom/nordstar'],
        optimizeServerReact: true,
        partialFallbacks: true,
        prerenderEarlyExit: true,
        proxyPrefetch: 'strict',
        rootParams: true,
        scrollRestoration: true,
        serverComponentsHmrCache: isDev,
        serverSourceMaps: true,
        staleTimes: {
            dynamic: 30,
            static: 60 * 15, // TODO: Investigate if 15 min is a good cache time.
        },
        taint: true,
        turbopackFileSystemCacheForDev: true,
        turbopackServerFastRefresh: true,
        typedEnv: true,
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

/**
 *
 * @param {import('next').NextConfig} config
 * @returns
 */
const wrapConfig = (config) => {
    if (isDev) {
        console.warn('Development mode detected, skipping logging...');
        // TODO: Add logging service.
        return config;
    }

    return config;
};

export default wrapConfig(config);

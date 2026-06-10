import 'dotenv/config';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveBuildEnv } from '@nordcom/commerce-utils/env';

import { buildContentSecurityPolicy } from './src/utils/csp.mjs';

const { isDev, environment, gitSHA } = resolveBuildEnv(process.env);

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
        optimizePackageImports: [
            '@apollo/client',
            '@shopify/hydrogen-react',
            '@nordcom/nordstar',
            'lucide-react',
            'sonner',
            '@radix-ui/react-dialog',
            'react-payment-brand-icons',
        ],
        optimizeServerReact: true,
        partialFallbacks: true,
        prerenderEarlyExit: true,
        proxyPrefetch: 'strict',
        rootParams: true,
        scrollRestoration: true,
        serverComponentsHmrCache: isDev,
        serverSourceMaps: true,
        // The router client cache is automatically invalidated by
        // revalidateTag/revalidatePath (Shopify webhooks hit
        // /[domain]/api/revalidate). Freshness is owned by tags, so these
        // values are tuned for perceived navigation speed.
        staleTimes: {
            dynamic: 120,
            static: 60 * 60,
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
            // CMSMEDIA-03: CMS media serves from Convex file storage (`storage.getUrl`, resolved
            // at read time — see @nordcom/commerce-cms/media/urls). Pinned explicitly so removing
            // the multi-tenant `*` wildcard above never silently breaks every CMS image.
            {
                protocol: 'https',
                hostname: '**.convex.cloud',
            },
        ],
        formats: ['image/webp', 'image/avif'],
    },
    typescript: {
        ignoreBuildErrors: true,
        tsconfigPath: 'tsconfig.json',
    },
    async headers() {
        const contentSecurityPolicy = buildContentSecurityPolicy({
            convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
            isDev,
        });

        return ['/', '/:path*'].map((source) => ({
            source,
            headers: [
                {
                    key: 'X-Powered-By',
                    value: `Nordcom Commerce (${process.env.SERVICE_DOMAIN || 'unknown'})`,
                },
                {
                    key: 'Content-Security-Policy',
                    value: contentSecurityPolicy,
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

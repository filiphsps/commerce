import 'dotenv/config';

import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveBuildEnv } from '@nordcom/commerce-utils/env';

const { isDev, environment, gitSHA } = resolveBuildEnv(process.env);

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

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    allowedDevOrigins: ['admin.localhost', 'localhost'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    compress: !isDev,
    reactCompiler: true,
    trailingSlash: true,
    // cacheComponents: true, // TODO: Enable as soon as possible.
    typedRoutes: true,
    // `sharp` (the media-upload pipeline's image resizer) is a native module: keep it OUT of the
    // server bundle so it loads from node_modules at runtime, where pnpm resolves its own deps. The
    // Turbopack build otherwise copies a partial `sharp` into `.next/node_modules/` without its
    // runtime `detect-libc`, and the media action throws ERR_MODULE_NOT_FOUND at upload time.
    serverExternalPackages: ['sharp'],
    turbopack: {
        root: path.resolve(path.join(__dirname, '../..')),
    },
    experimental: {
        authInterrupts: true,
        appNewScrollHandler: true,
        appNavFailHandling: true,
        caseSensitiveRoutes: false, // TODO: Update editor routing to support case-insensitive routes.
        esmExternals: true,
        dynamicOnHover: true,
        // cachedNavigations: true, // TODO: Enable together with cacheComponents.
        // proxyPrefetch: 'flexible', // TODO: Evaluate for the editor routes.
        optimizePackageImports: undefined,
        // `optimizeServerReact` rewrites RSC trees in ways that can break
        // third-party admin UIs. Off for the admin.
        // optimizeServerReact: true,
        scrollRestoration: true,
        serverComponentsHmrCache: isDev,
        serverSourceMaps: true,
        // partialFallbacks: true, // TODO: Enable together with cacheComponents.
        taint: true,
        typedEnv: true,
        webpackBuildWorker: false,
        rootParams: true,
        turbopackServerFastRefresh: true,
        turbopackFileSystemCacheForDev: true,
        mcpServer: isDev,
    },
    images: {
        dangerouslyAllowSVG: true,
        //minimumCacheTTL: 60,
        contentDispositionType: 'inline',
        remotePatterns: imageRemotePatterns,
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
        GIT_COMMIT_SHA: gitSHA,
        AUTH_URL: process.env.AUTH_URL,
    },
    async generateBuildId() {
        if (isDev) {
            return 'dev';
        }

        return gitSHA;
    },

    // TODO: handle all redirects at the edge.
    skipTrailingSlashRedirect: false,
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

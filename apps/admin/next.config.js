import 'dotenv/config';

import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withPayload } from '@payloadcms/next/withPayload';
import createVercelToolbar from '@vercel/toolbar/plugins/next';

const withVercelToolbar = createVercelToolbar({
    devServerPort: 3000,
});

const isDev = process.env.NODE_ENV === 'development';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || undefined;
const LANDING_DOMAIN = process.env.LANDING_DOMAIN || undefined;

const imageRemotePatterns = [
    { protocol: 'https', hostname: '**.unsplash.com' },
    { protocol: 'https', hostname: '**.shopify.com' },
    { protocol: 'https', hostname: '**.github.io' },
    { protocol: 'https', hostname: '**.gravatar.com' },
];

if (LANDING_DOMAIN) {
    imageRemotePatterns.unshift({ protocol: 'https', hostname: LANDING_DOMAIN });
}
if (ADMIN_DOMAIN) {
    imageRemotePatterns.unshift({ protocol: 'https', hostname: ADMIN_DOMAIN });
}

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    compress: true,
    trailingSlash: true,
    transpilePackages: [],
    reactCompiler: true,
    cacheComponents: true,
    typedRoutes: true,
    turbopack: { root: path.resolve(path.join(__dirname, '../..')) },
    experimental: {
        appNavFailHandling: true,
        caseSensitiveRoutes: true,
        // `cssChunking` + `optimizeCss` (critters) silently mangle Payload's
        // `@layer payload-default, payload` cascade and inline rules in a way
        // that strips the admin UI styles in production webpack builds. The
        // local Turbopack dev server doesn't run either optimization so the
        // breakage was invisible until deploy.
        esmExternals: true,
        proxyPrefetch: 'flexible',
        optimizePackageImports: ['@apollo/client', '@shopify/hydrogen-react'],
        optimizeServerReact: true,
        parallelServerBuildTraces: true,
        parallelServerCompiles: true,
        scrollRestoration: true,
        serverComponentsHmrCache: true,
        serverSourceMaps: true,
        staleTimes: { dynamic: 0, static: 180 },
        taint: true,
        typedEnv: true,
        useWasmBinary: false,
        webpackBuildWorker: true,
        rootParams: true,
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
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
        AUTH_URL: process.env.AUTH_URL,
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    },

    webpack: !isDev
        ? (config, { webpack, isServer }) => {
              config.experiments = {
                  ...config.experiments,
                  topLevelAwait: true,
              };

              config.plugins.push(
                  new webpack.DefinePlugin({
                      __SENTRY_DEBUG__: false,
                      __SENTRY_TRACING__: false,
                      __RRWEB_EXCLUDE_IFRAME__: true,
                      __RRWEB_EXCLUDE_SHADOW_DOM__: true,
                      __SENTRY_EXCLUDE_REPLAY_WORKER__: true,
                  }),
              );

              if (isServer) {
                  config.devtool = 'source-map';
              }
              return config;
          }
        : undefined,

    // We handle all redirects at the edge.
    skipTrailingSlashRedirect: true,
};

export default withPayload(withVercelToolbar(config));

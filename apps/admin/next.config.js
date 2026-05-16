import 'dotenv/config';

import { execSync } from 'node:child_process';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withPayload } from '@payloadcms/next/withPayload';
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

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx'],
    poweredByHeader: false,
    generateEtags: true,
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    compress: true,
    trailingSlash: true,
    // `@payloadcms/ui` field components are imported directly by routes in
    // `(app)/(dashboard)/[domain]/content/*`. Without explicit transpilation
    // Next.js doesn't process the package's `.scss` imports, and the field
    // wrappers render unstyled.
    transpilePackages: ['@payloadcms/ui'],
    // The Payload admin is a third-party UI we don't fully control. Every
    // experimental flag that rewrites React semantics (auto-memoization,
    // server-React optimization) or aggressively caches segments has been
    // a vector for "admin loads broken in prod" — leave them off here.
    // Re-enable individually only after verifying the admin still works.
    //
    // Specifically disabled:
    // - reactCompiler: auto-memoization can stale Payload's `useNav()` etc.
    //   so the hamburger menu won't toggle.
    // - cacheComponents (PPR): wraps Payload's RootLayout in
    //   `<Suspense fallback={null}>` and Next's CSS hoisting drops the
    //   admin stylesheet links from the initial shell.
    // cacheComponents: true,
    typedRoutes: true,
    turbopack: {
        root: path.resolve(path.join(__dirname, '../..')),
    },
    experimental: {
        appNavFailHandling: true,
        // `caseSensitiveRoutes` makes Payload's camelCase collection URLs
        // (`/cms/collections/businessData`) brittle — any internal nav that
        // happens to lowercase the slug 404s. Leave off.
        // caseSensitiveRoutes: true,
        // `cssChunking` + `optimizeCss` (critters) silently mangle Payload's
        // `@layer payload-default, payload` cascade and inline rules in a way
        // that strips the admin UI styles in production webpack builds. The
        // local Turbopack dev server doesn't run either optimization so the
        // breakage was invisible until deploy.
        esmExternals: true,
        // `proxyPrefetch: 'flexible'` changes how routes are prefetched on
        // hover — can stale Payload's data-fetching tree. Off until proven.
        // proxyPrefetch: 'flexible',
        optimizePackageImports: undefined,
        // `optimizeServerReact` rewrites RSC trees in ways that can break
        // third-party admin UIs. Off for the admin.
        // optimizeServerReact: true,
        parallelServerBuildTraces: undefined,
        parallelServerCompiles: undefined,
        scrollRestoration: true,
        serverComponentsHmrCache: isDev,
        serverSourceMaps: true,
        taint: true,
        typedEnv: true,
        useWasmBinary: false,
        webpackBuildWorker: undefined,
        rootParams: true,
        turbopackServerFastRefresh: isDev,
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

    // We handle all redirects at the edge.
    skipTrailingSlashRedirect: true,
};

//
export default withVercelToolbar(withPayload(config));

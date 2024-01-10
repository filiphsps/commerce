import withMarkdoc from '@markdoc/next.js';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
    poweredByHeader: false,
    generateEtags: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    productionBrowserSourceMaps: true,
    compress: true,
    transpilePackages: ['react-icons'],
    experimental: {
        caseSensitiveRoutes: true,
        instrumentationHook: true,
        //nextScriptWorkers: true,
        optimizeCss: true,
        optimizePackageImports: ['react-icons'],
        //ppr: true,
        scrollRestoration: true,
        serverComponentsExternalPackages: [],
        serverSourceMaps: true,
        serverMinification: false,
        //taint: true,
        webpackBuildWorker: true
    },
    images: {
        dangerouslyAllowSVG: true,
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
    sassOptions: {
        includePaths: [path.join(__dirname, 'src/scss'), path.join(__dirname, 'src')]
    },

    env: {
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    },
    serverRuntimeConfig: {
        POSTGRES_PRISMA_ACCELERATE_URL: process.env.POSTGRES_PRISMA_ACCELERATE_URL,
        ENVIRONMENT: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    },

    async rewrites() {
        return {
            beforeFiles: [
                {
                    source: '/admin',
                    destination: 'https://nordcom-commerce-admin.vercel.app/admin/'
                },
                {
                    source: '/admin/:path*',
                    destination: 'https://nordcom-commerce-admin.vercel.app/admin/:path*'
                }
            ]
        };
    },

    async generateBuildId() {
        if (process.env.NODE_ENV === 'development') return 'dev';
        return process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    }
};

export default withMarkdoc({
    mode: 'static',
    schemaPath: './src/markdoc',
    tokenizerOptions: {
        allowComments: true,
        slots: true
    }
})(config);

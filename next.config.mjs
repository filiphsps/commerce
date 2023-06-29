import manifest from './package.json' assert { type: 'json' };
import { i18n } from './next-i18next.config.cjs';
import { withSentryConfig } from '@sentry/nextjs';
import createNextPluginPreval from 'next-plugin-preval/config.js';

const withNextPluginPreval = createNextPluginPreval();

/** @type {import('next').NextConfig} */
let config = {
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    i18n,
    productionBrowserSourceMaps: true,
    experimental: {
        esmExternals: true
    },

    images: {
        domains: ['cdn.shopify.com', 'images.prismic.io', 'images.unsplash.com']
    },
    compiler: {
        styledComponents: {
            ssr: true,
            minify: true,
            transpileTemplateLiterals: true,
            pure: true
        }
    },
    env: {
        // Settings
        DOMAIN: process.env.DOMAIN || 'www.sweetsideofsweden.com',
        SHOPIFY_DOMAIN: process.env.SHOPIFY_DOMAIN || 'sweet-side-of-sweden.myshopify.com',
        SHOPIFY_TOKEN: process.env.SHOPIFY_TOKEN || '319eb651b3464ea882a016ca2085ebc1',
        PRISMIC_REPO: process.env.PRISMIC_REPO || 'https://candy-by-sweden.cdn.prismic.io/api/v2',
        STORE_LOCALES: process.env.STORE_LOCALES || 'en-US',
        STORE_CURRENCIES: process.env.STORE_CURRENCIES || 'USD',
        GTM: process.env.GTM,

        // Colors
        ACCENT_PRIMARY: process.env.ACCENT_PRIMARY,
        ACCENT_SECONDARY: process.env.ACCENT_SECONDARY,

        VERSION: manifest.version
    },

    async redirects() {
        return [
            {
                source: '/admin/',
                destination: `https://${process.env.SHOPIFY_DOMAIN}/admin`,
                permanent: true
            },
            {
                source: '/products/',
                destination: '/shop/',
                permanent: true
            },
            {
                source: '/x-default/:slug*',
                destination: '/:slug',
                permanent: true
            }
        ];
    }
};

export default withSentryConfig(
    withNextPluginPreval(config),
    {
        // For all available options, see:
        // https://github.com/getsentry/sentry-webpack-plugin#options

        // Suppresses source map uploading logs during build
        silent: true,

        org: 'sweet-side-of-sweden',
        project: 'frontend'
    },
    {
        // For all available options, see:
        // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

        // Upload a larger set of source maps for prettier stack traces (increases build time)
        widenClientFileUpload: true,

        // Transpiles SDK to be compatible with IE11 (increases bundle size)
        transpileClientSDK: true,

        // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
        // tunnelRoute: '/monitoring',

        // Hides source maps from generated client bundles
        hideSourceMaps: false,

        // Automatically tree-shake Sentry logger statements to reduce bundle size
        disableLogger: true
    }
);

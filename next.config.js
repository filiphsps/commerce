import manifest from './package.json' assert { type: 'json' };
import { i18n } from './next-i18next.config.js';
import * as child_process from 'child_process';
import * as nextInterceptStdout from 'next-intercept-stdout';
import { withSentryConfig } from '@sentry/nextjs';

const withInterceptStdout = nextInterceptStdout.default;

const git_sha = child_process
    .execSync('git rev-parse HEAD', {
        cwd: './',
        encoding: 'utf8'
    })
    .replace(/\n/, '');

let config = {
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    //largePageDataBytes: 256 * 1000,
    i18n,

    images: {
        domains: ['cdn.shopify.com', 'images.prismic.io']
    },
    compiler: {
        styledComponents: true
    },
    env: {
        // Settings
        DOMAIN: process.env.DOMAIN,
        SHOPIFY_DOMAIN:
            process.env.SHOPIFY_DOMAIN || 'sweet-side-of-sweden.myshopify.com',
        SHOPIFY_TOKEN:
            process.env.SHOPIFY_TOKEN || '9999e3dceb5bc1faee8441045bf04045',
        PRISMIC_REPO:
            process.env.PRISMIC_REPO ||
            'https://candy-by-sweden.cdn.prismic.io/api/v2',
        STORE_LOCALES: process.env.STORE_LOCALES || 'en-US',
        STORE_CURRENCIES: process.env.STORE_CURRENCIES || 'USD',
        GTM: process.env.GTM,

        // Colors
        ACCENT_PRIMARY: process.env.ACCENT_PRIMARY,
        ACCENT_SECONDARY: process.env.ACCENT_SECONDARY,

        // Feature flags
        FEATURE_ACCOUNTS: process.env.FEATURE_ACCOUNTS,

        GIT_SHA: git_sha,
        VERSION: manifest.version
    },

    generateBuildId: async () => {
        return git_sha;
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
                source: '/__default/:slug*',
                destination: '/:slug',
                permanent: false
            }
        ];
    }
};

export default withSentryConfig(
    typeof withInterceptStdout !== 'function'
        ? config
        : withInterceptStdout(config, (text) => {
              if (
                  text.includes('Do not add stylesheets') ||
                  text.includes('The Fetch API is') ||
                  text.includes('Debugger attached.')
              )
                  return '';

              return text;
          }),
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
        tunnelRoute: '/monitoring',

        // Hides source maps from generated client bundles
        hideSourceMaps: true,

        // Automatically tree-shake Sentry logger statements to reduce bundle size
        disableLogger: true
    }
);

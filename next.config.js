const child_process = require('child_process');
const manifest = require('./package.json');
const { i18n } = require('./next-i18next.config');

const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

const git_sha = child_process.execSync('git rev-parse HEAD', {
    cwd: __dirname,
    encoding: 'utf8'
}).replace(/\n/, '');

module.exports = withBundleAnalyzer({
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    //largePageDataBytes: 256 * 1000,
    i18n,

    images: {
        domains: ['cdn.shopify.com', 'images.prismic.io'],
    },
    compiler: {
        styledComponents: true,
    },
    env: {
        // Settings
        DOMAIN: process.env.DOMAIN,
        SHOPIFY_DOMAIN: process.env.SHOPIFY_DOMAIN,
        SHOPIFY_TOKEN: process.env.SHOPIFY_TOKEN,
        PRISMIC_REPO: process.env.PRISMIC_REPO,
        STORE_LOCALES: process.env.STORE_LOCALES,
        STORE_CURRENCIES: process.env.STORE_CURRENCIES,
        SENTRY_DSN: process.env.SENTRY_DSN,
        GTM: process.env.GTM,

        // Feature flags
        FEATURE_ACCOUNTS: process.env.FEATURE_ACCOUNTS,
        FEATURE_REVIEWS: process.env.FEATURE_REVIEWS,


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
                permanent: false,
            },
        ];
    },
});

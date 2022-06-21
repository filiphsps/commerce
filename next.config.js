const child_process = require('child_process');

const withTM = require('next-transpile-modules')([
    'react-responsive-carousel',
]);

const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

const git_sha = child_process.execSync('git rev-parse HEAD', {
    cwd: __dirname,
    encoding: 'utf8'
}).replace(/\n/, '');

module.exports = withBundleAnalyzer(withTM({
    projectRoot: __dirname,
    poweredByHeader: false,
    strictMode: true,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    target: 'server',
    /*i18n: {
        locales: ['en-US'],
        defaultLocale: 'en-US',
    },*/
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
    images: {
        domains: ['cdn.shopify.com', 'images.prismic.io'],
    },
    compiler: {
        styledComponents: true,
    },
    env: {
        GIT_SHA: git_sha
    }
}));

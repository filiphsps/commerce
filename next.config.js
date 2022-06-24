const child_process = require('child_process');

const withTM = require('next-transpile-modules')([
    'react-responsive-carousel',
]);

const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(withTM({
    projectRoot: __dirname,
    poweredByHeader: false,
    strictMode: true,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    target: 'server',
    generateBuildId: async () => {
        return child_process.execSync('git rev-parse --short HEAD', {
            cwd: __dirname,
            encoding: 'utf8'
        });
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
}));

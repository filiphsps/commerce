const withTM = require('next-transpile-modules')([
    'react-responsive-carousel',
]);

const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

var default_locale = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en-US').replace('_', '-');
var languages = process.env.NEXT_PUBLIC_LANGUAGE?.split(',');
if (!languages || languages.length <= 0) languages = ['en-US'];

module.exports = withBundleAnalyzer(withTM({
    projectRoot: __dirname,
    poweredByHeader: false,
    strictMode: true,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    target: 'server',
    async redirects() {
        return [
            {
                source: '/admin/',
                destination: `https://${process.env.STORE}/admin`,
                permanent: false,
            },
        ];
    },
    images: {
        domains: ['cdn.shopify.com', 'images.prismic.io'],
    },
    i18n: {
        locales: languages,
        defaultLocale: default_locale
    },
    compiler: {
        styledComponents: true,
    },
}));

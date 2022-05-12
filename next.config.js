const withTM = require('next-transpile-modules')([
    'react-responsive-carousel',
]);

var default_locale = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en-US').replace('_', '-');
var languages = process.env.NEXT_PUBLIC_LANGUAGE?.split(',');
if (!languages || languages.length <= 0) languages = ['en-US'];

module.exports = withTM({
    projectRoot: __dirname,
    poweredByHeader: false,
    strictMode: true,
    trailingSlash: true,
    swcMinify: true,
    target: 'server',
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
});

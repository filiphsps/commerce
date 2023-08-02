const locales = [
    ...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])
];

const i18n = {
    locales: ['x-default', ...locales],
    defaultLocale: 'x-default',
    localeDetection: false
};

module.exports = { i18n, reloadOnPrerender: process.env.NODE_ENV === 'development' };

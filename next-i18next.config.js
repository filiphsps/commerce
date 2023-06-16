var locales = [
    ...(process.env.STORE_LOCALES
        ? [...process.env.STORE_LOCALES.split(',')]
        : ['en-US'])
];

const i18n = {
    locales: ['__default', ...locales],
    defaultLocale: '__default', //locales[0] || 'en-US',
    localeDetection: false
};

const fallbackLng = {
    default: [locales[0]]
};

const nonExplicitSupportedLngs = true;

export {
    i18n,
    fallbackLng,
    nonExplicitSupportedLngs,
};

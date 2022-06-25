module.exports = {
    i18n: {
        locales: process.env.STORE_LOCALES ? process.env.STORE_LOCALES.split(',') : ['en-US'],
        defaultLocale: process.env.STORE_LOCALES ? process.env.STORE_LOCALES.split(',')[0] : 'en-US',
    },
};

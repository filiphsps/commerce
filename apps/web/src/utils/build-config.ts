export const BuildConfig = {
    environment: process.env.NODE_ENV || 'production',
    GTM: process.env.GTM,

    shopify: {
        api: '2023-10'
    },

    prismic: {
        toolbar: false,
        repo: process.env.PRISMIC_REPO || 'https://candy-by-sweden.cdn.prismic.io/api/v2',
        name: (process.env.PRISMIC_REPO || 'candy-by-sweden')
            .replace('https://', '')
            .replace('.cdn.prismic.io/api/v2', '')
    },

    i18n: {
        locales: process.env.STORE_LOCALES?.split?.(',') || ['en-US'],
        default: process.env.STORE_DEFAULT_LOCALE || 'en-US',
        currencies: process.env.STORE_CURRENCIES?.split(',') || ['USD']
    }
};

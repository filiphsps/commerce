export const Config = {
    environment: process.env.NODE_ENV || 'production',
    domain: process.env.DOMAIN,
    beta_features: process.env.BETA_FEATURES === 'true',

    shopify: {
        domain: process.env.SHOPIFY_DOMAIN,
        token: process.env.SHOPIFY_TOKEN
    },

    prismic: {
        domain: process.env.PRISMIC_DOMAIN
    },

    i18n: {
        locales: process.env.STORE_LOCALES?.split(',') || ['en-US'],
        currencies: process.env.STORE_CURRENCIES?.split(',') || ['USD']
    }
};

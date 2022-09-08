// FIXME: Handle 'NEXT_PUBLIC' requirements.

export const Config = {
    environment: process.env.NODE_ENV || 'production',
    version: process.env.VERSION,
    git_sha: process.env.GIT_SHA,
    domain: process.env.DOMAIN || 'candybysweden.com',

    features: {
        accounts: process.env.FEATURE_ACCOUNTS === 'true'
    },

    shopify: {
        domain: process.env.SHOPIFY_DOMAIN || 'candy-by-sweden.myshopify.com',
        token: process.env.SHOPIFY_TOKEN || '234f356a7e866a3fecfa3d2f0c9a7c85'
    },

    prismic: {
        repo:
            process.env.PRISMIC_REPO ||
            'https://candy-by-sweden.cdn.prismic.io/api/v2'
    },

    i18n: {
        locales: process.env.STORE_LOCALES?.split(',') || ['en-US'],
        currencies: process.env.STORE_CURRENCIES?.split(',') || ['USD']
    },

    colors: {
        primary: process.env.ACCENT_PRIMARY || '#0476D9',
        secondary: process.env.ACCENT_SECONDARY || '#F7D435'
    }
};

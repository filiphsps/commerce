export const Config = {
    environment: process.env.NODE_ENV || 'production',
    version: process.env.VERSION,
    git_sha: process.env.GIT_SHA,
    domain: process.env.DOMAIN || 'www.sweetsideofsweden.com',
    GTM: process.env.GTM,
    brevo: process.env.BREVO_ENABLED,
    features: {
        accounts: process.env.FEATURE_ACCOUNTS === 'true'
    },

    shopify: {
        shop_id:
            (process.env.SHOPIFY_SHOP_ID && Number.parseInt(process.env.SHOPIFY_SHOP_ID)) ||
            76188483889,
        domain: (process.env.SHOPIFY_DOMAIN || 'sweet-side-of-sweden.myshopify.com').replace(
            'https://',
            ''
        ),
        token: process.env.SHOPIFY_TOKEN || '9999e3dceb5bc1faee8441045bf04045',
        api: '2023-04',
        checkout_domain: process.env.SHOPIFY_CHECKOUT_DOMAIN || 'checkout.sweetsideofsweden.com'
    },

    prismic: {
        repo: process.env.PRISMIC_REPO || 'https://candy-by-sweden.cdn.prismic.io/api/v2'
    },

    i18n: {
        locales: process.env.STORE_LOCALES?.split?.(',') || ['en-US'],
        currencies: process.env.STORE_CURRENCIES?.split(',') || ['USD']
    },

    colors: {
        primary: process.env.ACCENT_PRIMARY || '#274690',
        secondary: process.env.ACCENT_SECONDARY || '#EDD382'
    }
};

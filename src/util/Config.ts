export const Config = {
    environment: process.env.NODE_ENV || 'production',
    version: process.env.VERSION,
    domain: process.env.DOMAIN || 'www.sweetsideofsweden.com',
    GTM: process.env.GTM,

    shopify: {
        shop_id: (process.env.SHOPIFY_SHOP_ID && Number.parseInt(process.env.SHOPIFY_SHOP_ID)) || 76188483889,
        domain: (process.env.SHOPIFY_DOMAIN || 'sweet-side-of-sweden.myshopify.com').replace('https://', ''),
        token: process.env.SHOPIFY_TOKEN || '4991548da2a9d3dcc6dff9e2e4154b16', // 319eb651b3464ea882a016ca2085ebc1
        api: '2023-07',
        checkout_domain: process.env.SHOPIFY_CHECKOUT_DOMAIN || 'checkout.sweetsideofsweden.com'
    },

    prismic: {
        repo: process.env.PRISMIC_REPO || 'https://candy-by-sweden.cdn.prismic.io/api/v2',
        name: (process.env.PRISMIC_REPO || 'candy-by-sweden')
            .replace('https://', '')
            .replace('.cdn.prismic.io/api/v2', '')
    },

    i18n: {
        locales: process.env.STORE_LOCALES?.split?.(',') || ['en-US'],
        default: process.env.STORE_DEFAULT_LOCALE || 'en-US',
        currencies: process.env.STORE_CURRENCIES?.split(',') || ['USD']
    },

    colors: {
        primary: process.env.ACCENT_PRIMARY || '#274690',
        secondary: process.env.ACCENT_SECONDARY || '#EDD382'
    }
};

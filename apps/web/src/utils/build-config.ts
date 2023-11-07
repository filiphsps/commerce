export const BuildConfig = {
    environment: process.env.NODE_ENV || 'production',
    domain: process.env.DOMAIN || 'www.sweetsideofsweden.com',
    GTM: process.env.GTM,

    shopify: {
        shop_id: (process.env.SHOPIFY_SHOP_ID && Number.parseInt(process.env.SHOPIFY_SHOP_ID)) || 76188483889,
        storefront_id: process.env.SHOPIFY_STOREFRONT_ID || '2130225',
        domain: (process.env.SHOPIFY_DOMAIN || 'sweet-side-of-sweden.myshopify.com').replace('https://', ''),
        token: process.env.SHOPIFY_TOKEN || '319eb651b3464ea882a016ca2085ebc1',
        private_token: process.env.SHOPIFY_PRIVATE_TOKEN || undefined,
        api: '2023-10',
        checkout_domain: process.env.SHOPIFY_CHECKOUT_DOMAIN || 'checkout.sweetsideofsweden.com'
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

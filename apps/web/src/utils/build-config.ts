export const BuildConfig = {
    environment: process.env.NODE_ENV,

    shopify: {
        api: '2024-04'
    },

    prismic: {
        toolbar: false,
        repo: 'https://candy-by-sweden.cdn.prismic.io/api/v2',
        name: 'candy-by-sweden'
    }
};

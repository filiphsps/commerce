/* c8 ignore start */
export const BuildConfig = {
    environment: process.env.NODE_ENV,

    shopify: {
        api: '2024-07' as const,
    },
};

export const COMMERCE_DEFAULTS = {
    maxQuantity: 199_999,
    processingTimeInDays: 5,
} as const;

export const FLAG_IMAGES_BASE_URL =
    process.env.NEXT_PUBLIC_FLAG_IMAGES_BASE_URL ??
    'https://purecatamphetamine.github.io/country-flag-icons/3x2';
/* c8 ignore stop */

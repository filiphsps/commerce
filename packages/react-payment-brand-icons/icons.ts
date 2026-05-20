import type { IconOverrides } from './scripts/types';

// Curated overrides on top of auto-derived defaults.
// Slugs match the filenames in ./svgs/. Aliases let `<PaymentIcon name>` accept
// Shopify's exact return strings without normalization at the call site.
export const overrides: IconOverrides = {
    // ---- Shopify CardBrand enum (lowercased) ----
    visa: { componentName: 'Visa', title: 'Visa' },
    mastercard: { componentName: 'Mastercard', title: 'Mastercard' },
    american_express: { componentName: 'AmericanExpress', title: 'American Express', aliases: ['amex'] },
    discover: { componentName: 'Discover', title: 'Discover' },
    jcb: { componentName: 'Jcb', title: 'JCB' },
    diners_club: { componentName: 'DinersClub', title: 'Diners Club' },
    elo: { componentName: 'Elo', title: 'Elo' },
    // union_pay SVG is named unionpay.svg — alias covers Shopify's "union_pay" string
    unionpay: { componentName: 'UnionPay', title: 'UnionPay', aliases: ['union_pay'] },

    // ---- Shopify DigitalWallet enum (lowercased) ----
    apple_pay: { componentName: 'ApplePay', title: 'Apple Pay' },
    google_pay: { componentName: 'GooglePay', title: 'Google Pay' },
    shopify_pay: { componentName: 'ShopifyPay', title: 'Shopify Pay' },
    // shop_pay.svg does not exist in the source set; shopify_pay covers this brand
    amazon: { componentName: 'Amazon', title: 'Amazon' },
    facebook_pay: { componentName: 'FacebookPay', title: 'Facebook Pay' },
    paypal: { componentName: 'Paypal', title: 'PayPal' },
    venmo: { componentName: 'Venmo', title: 'Venmo' },
    klarna: { componentName: 'Klarna', title: 'Klarna' },
    afterpay: { componentName: 'Afterpay', title: 'Afterpay' },
    affirm: { componentName: 'Affirm', title: 'Affirm' },
    sezzle: { componentName: 'Sezzle', title: 'Sezzle' },

    // ---- Other widely-used brands (curated to drop the auto-derived ugliness) ----
    bitcoin: { componentName: 'Bitcoin', title: 'Bitcoin', aliases: ['btc'] },
    ethereum: { componentName: 'Ethereum', title: 'Ethereum', aliases: ['eth'] },
    swish: { componentName: 'Swish', title: 'Swish' },
    twint: { componentName: 'Twint', title: 'TWINT' },
    ideal: { componentName: 'Ideal', title: 'iDEAL' },
    bancontact: { componentName: 'Bancontact', title: 'Bancontact' },
    sofort: { componentName: 'Sofort', title: 'Sofort' },
    giropay: { componentName: 'Giropay', title: 'Giropay' },
    // przelewy24.svg does not exist in the source set; omitted
    blik: { componentName: 'Blik', title: 'BLIK' },
    wechatpay: { componentName: 'Wechatpay', title: 'WeChat Pay', aliases: ['wechat_pay'] },
    alipay: { componentName: 'Alipay', title: 'Alipay' },
};

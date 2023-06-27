// FIXME: Remove this extremely ugly hack once @@shopify/hydrogen-react or @next fixes their library.

import fs from 'fs';

const files = [
    'AddToCartButton',
    'BuyNowButton',
    'CartCheckoutButton',
    'CartLineProvider',
    'CartProvider',
    'load-script',
    'ModelViewer',
    'ProductProvider',
    'ShopifyProvider',
    'useShopifyCookies'
];

try {
    const payload = `'use client';\n\n`;
    const prefix = 'node_modules/@shopify/hydrogen-react/dist/';

    files.map((file) => {
        [`${prefix}/node-dev/${file}.mjs`, `${prefix}/node-prod/${file}.mjs`].map((path) => {
            const data = fs.readFileSync(path).toString();
            if (data.startsWith(payload)) return;

            fs.writeFileSync(path, `${payload}${data}`);
        });
    });
} catch (e) {
    console.log(e);
    console.log('Hack failed');
    throw e;
}

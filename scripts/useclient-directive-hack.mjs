/* eslint-disable no-console */
import fs from 'fs';

try {
    const payload = `'use client';\n\n`;

    {
        // TODO: Remove this extremely ugly hack once @shopify/hydrogen-react or @next fixes their library.
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

        const prefix = 'node_modules/@shopify/hydrogen-react/dist/';

        files.map((file) => {
            [
                `${prefix}/node-dev/${file}.mjs`,
                `${prefix}/node-prod/${file}.mjs`,
                `${prefix}/browser-dev/${file}.mjs`,
                `${prefix}/browser-prod/${file}.mjs`
            ].map((path) => {
                const data = fs.readFileSync(path).toString();
                if (data.startsWith(payload)) return;

                fs.writeFileSync(path, `${payload}${data}`);
            });
        });
    }
} catch (e) {
    console.log(e);
    console.log('Hack failed');
    throw e;
}

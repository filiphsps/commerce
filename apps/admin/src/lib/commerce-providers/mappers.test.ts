import { describe, expect, it } from 'vitest';

import { PROVIDER_MAPPERS } from './mappers';

describe('PROVIDER_MAPPERS.shopify', () => {
    it('builds a shopify commerceProvider with the secret token attached', () => {
        const provider = PROVIDER_MAPPERS.shopify({
            storeDomain: 'https://Acme.myshopify.com/',
            publicToken: ' pub ',
            privateToken: ' shpat_secret ',
        });

        expect(provider).toEqual({
            type: 'shopify',
            authentication: {
                token: 'shpat_secret',
                publicToken: 'pub',
                domain: 'acme.myshopify.com',
            },
            storefrontId: 'acme.myshopify.com',
            domain: 'acme.myshopify.com',
            id: 'acme.myshopify.com',
        });
    });

    it('uses an explicit storefrontId when provided', () => {
        const provider = PROVIDER_MAPPERS.shopify({
            storeDomain: 'acme.myshopify.com',
            publicToken: 'pub',
            privateToken: 'sec',
            storefrontId: 'gid://shopify/Shop/42',
        });
        expect(provider.type === 'shopify' && provider.storefrontId).toBe('gid://shopify/Shop/42');
    });
});

import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import shopifyCartAdapter from './adapters/shopify';
import type { CartProviderAdapter } from './types';

export function resolveCartProvider(shop: OnlineShop): CartProviderAdapter {
    switch (shop.commerceProvider.type) {
        case 'shopify':
            return shopifyCartAdapter;
        default:
            throw new UnknownCommerceProviderError(shop.commerceProvider.type);
    }
}

export { CartNotFoundError, CartProviderError, CartUserError } from '@nordcom/commerce-errors';
export type * from './types';

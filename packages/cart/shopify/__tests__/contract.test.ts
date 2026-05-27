import { runCartAdapterContract } from '@nordcom/cart-core/contract-tests';
import { createShopifyCartAdapter } from '../src/adapter';
import { mockShopifyTransport } from '../src/testing';

runCartAdapterContract({
    name: 'shopify (mock transport)',
    factory: () => createShopifyCartAdapter({ transport: mockShopifyTransport() }),
});

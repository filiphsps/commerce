import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

/** Returns a mock `Product` with three color variants where one variant is unavailable. */
export const productWithUnavailable = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/5',
        handle: 'partial-unavailable',
        title: 'Partial Unavailable Candy',
        options: [{ name: 'Color', values: ['Red', 'Blue', 'Green'] }],
        variants: {
            edges: [
                {
                    node: {
                        id: 'v-red',
                        availableForSale: true,
                        selectedOptions: [{ name: 'Color', value: 'Red' }],
                        price: { amount: '5.00', currencyCode: 'USD' },
                    },
                },
                {
                    node: {
                        id: 'v-blue',
                        availableForSale: false,
                        selectedOptions: [{ name: 'Color', value: 'Blue' }],
                        price: { amount: '5.00', currencyCode: 'USD' },
                    },
                },
                {
                    node: {
                        id: 'v-green',
                        availableForSale: true,
                        selectedOptions: [{ name: 'Color', value: 'Green' }],
                        price: { amount: '5.00', currencyCode: 'USD' },
                    },
                },
            ],
        },
    }) as unknown as Product;

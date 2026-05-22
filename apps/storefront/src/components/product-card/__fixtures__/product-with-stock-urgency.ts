import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

export const productWithStockUrgency = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/4',
        handle: 'low-stock',
        title: 'Low Stock Candy',
        variants: {
            edges: [
                {
                    node: {
                        id: 'v-low',
                        availableForSale: true,
                        quantityAvailable: 3,
                        price: { amount: '5.00', currencyCode: 'USD' },
                    },
                },
            ],
        },
    }) as unknown as Product;

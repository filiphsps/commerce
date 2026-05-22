import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

export const productSimple = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/1',
        handle: 'simple',
        title: 'Simple Candy',
        vendor: 'Test Vendor',
        productType: 'Candy',
        availableForSale: true,
        tags: [],
        images: {
            edges: [
                {
                    node: {
                        id: 'img-1',
                        url: 'https://cdn.test/simple-1.jpg',
                        altText: 'Simple front',
                        height: 800,
                        width: 800,
                    },
                },
            ],
        },
    }) as unknown as Product;

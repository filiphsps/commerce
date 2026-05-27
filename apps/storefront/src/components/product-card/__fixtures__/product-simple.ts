import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

/** Returns a mock `Product` with a single variant, image, and no special attributes. */
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
        variants: {
            edges: [
                {
                    node: {
                        id: 'gid://shopify/ProductVariant/1',
                        availableForSale: true,
                        selectedOptions: [{ name: 'Title', value: 'Default Title' }],
                        price: { amount: '10.00', currencyCode: 'USD' },
                    },
                },
            ],
        },
    }) as unknown as Product;

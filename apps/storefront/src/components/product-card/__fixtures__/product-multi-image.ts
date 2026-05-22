import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

export const productMultiImage = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/2',
        handle: 'multi-image',
        title: 'Multi-Image Candy',
        images: {
            edges: [
                {
                    node: {
                        id: 'img-1',
                        url: 'https://cdn.test/multi-1.jpg',
                        altText: 'Multi front',
                        height: 800,
                        width: 800,
                    },
                },
                {
                    node: {
                        id: 'img-2',
                        url: 'https://cdn.test/multi-2.jpg',
                        altText: 'Multi back',
                        height: 800,
                        width: 800,
                    },
                },
            ],
        },
    }) as unknown as Product;

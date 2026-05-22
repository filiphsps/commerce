import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

export const productMultiOption = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/3',
        handle: 'multi-option',
        title: 'Multi-Option Candy',
        options: [
            {
                name: 'Color',
                values: [
                    'Salt Black',
                    'Sweet Brown',
                    'Caramel Glaze',
                    'Apple Sour',
                    'Wild Strawberry',
                    'Pear Drop',
                    'Cherry Rose',
                    'Banana Yellow',
                ],
            },
            {
                name: 'Size',
                values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
            },
        ],
        variants: {
            edges: [
                {
                    node: {
                        id: 'v-1',
                        selectedOptions: [
                            { name: 'Color', value: 'Salt Black' },
                            { name: 'Size', value: 'XS' },
                        ],
                        availableForSale: true,
                        price: { amount: '9.99', currencyCode: 'USD' },
                    },
                },
            ],
        },
    }) as unknown as Product;

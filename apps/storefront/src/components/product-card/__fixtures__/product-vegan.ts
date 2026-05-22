import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

export const productVegan = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/8',
        handle: 'vegan',
        title: 'Vegan Candy',
        productType: 'confectionary',
        tags: ['Vegan'],
    }) as unknown as Product;

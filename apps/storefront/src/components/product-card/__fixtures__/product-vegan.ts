import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

/** Returns a mock `Product` tagged as vegan. */
export const productVegan = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/8',
        handle: 'vegan',
        title: 'Vegan Candy',
        productType: 'confectionary',
        tags: ['Vegan'],
    }) as unknown as Product;

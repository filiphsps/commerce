import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

export const productFreeShipping = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/6',
        handle: 'free-shipping',
        title: 'Free Shipping Candy',
        tags: ['Free Shipping'],
    }) as unknown as Product;

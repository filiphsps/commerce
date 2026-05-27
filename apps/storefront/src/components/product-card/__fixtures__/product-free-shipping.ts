import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

/** Returns a mock `Product` tagged with free shipping. */
export const productFreeShipping = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/6',
        handle: 'free-shipping',
        title: 'Free Shipping Candy',
        tags: ['Free Shipping'],
    }) as unknown as Product;

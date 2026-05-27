import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

/** Returns a mock `Product` that requires a selling plan (subscription). */
export const productSubscription = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/9',
        handle: 'subscription',
        title: 'Subscription Candy',
        requiresSellingPlan: true,
    }) as unknown as Product;

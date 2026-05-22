import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

export const productSubscription = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/9',
        handle: 'subscription',
        title: 'Subscription Candy',
        requiresSellingPlan: true,
    }) as unknown as Product;

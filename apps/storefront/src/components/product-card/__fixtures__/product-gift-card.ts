import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

/** Returns a mock `Product` configured as a gift card. */
export const productGiftCard = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/7',
        handle: 'gift',
        title: 'Gift Card',
        isGiftCard: true,
    }) as unknown as Product;

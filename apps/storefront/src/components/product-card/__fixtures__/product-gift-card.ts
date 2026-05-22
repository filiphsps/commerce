import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

export const productGiftCard = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/7',
        handle: 'gift',
        title: 'Gift Card',
        isGiftCard: true,
    }) as unknown as Product;

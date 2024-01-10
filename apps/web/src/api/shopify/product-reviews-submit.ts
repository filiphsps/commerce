import 'server-only';

import type { Shop } from '@/api/shop';
import { TodoError } from '@nordcom/commerce-errors';

export const ShopifyProductReviewsApi = async ({}: { shop: Shop }): Promise<any> => {
    throw new TodoError();
};

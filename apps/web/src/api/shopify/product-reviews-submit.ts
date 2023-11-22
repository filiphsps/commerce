import 'server-only';

import type { Shop } from '@/api/shop';
import { TodoError } from '@/utils/errors';

export const ShopifyProductReviewsApi = async ({}: { shop: Shop }): Promise<any> => {
    throw new TodoError();
};

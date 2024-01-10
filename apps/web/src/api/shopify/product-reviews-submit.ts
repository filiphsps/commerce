import 'server-only';

import type { Shop } from '@nordcom/commerce-database';
import { TodoError } from '@nordcom/commerce-errors';

export const ShopifyProductReviewsApi = async ({}: { shop: Shop }): Promise<any> => {
    throw new TodoError();
};

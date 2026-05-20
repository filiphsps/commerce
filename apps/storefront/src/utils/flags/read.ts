import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';

import { type EvaluateShopFlagOptions, evaluateShopFlag } from './evaluate';
import { getFlagOverrides } from './overrides';

export async function readFlag<T>(
    shop: OnlineShop,
    key: string,
    options: Omit<EvaluateShopFlagOptions<T>, 'overrides'> = {},
): Promise<T> {
    const overrides = await getFlagOverrides();
    return evaluateShopFlag<T>(shop, key, { ...options, overrides });
}

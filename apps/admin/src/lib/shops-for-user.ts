import 'server-only';

import { Shop } from '@nordcom/commerce-db';

export type ShopSwitcherEntry = { name: string; domain: string };

/** Returns the shops the given user has access to. For operators (role=admin), returns all shops. */
export async function getShopsForUser(_userId: string): Promise<ShopSwitcherEntry[]> {
    // TODO(shell-rework): scope by user.tenants in a follow-up. For now expose all shops.
    // TypeScript's overload picker resolves the empty-args form to the single-result
    // overload; cast through unknown to get the array shape we actually receive.
    const shops = (await Shop.find({ filter: {} })) as unknown as import('@nordcom/commerce-db').ShopBase[];
    return shops.map((s) => ({ name: s.name, domain: s.domain }));
}

import 'server-only';

import { Shop } from '@nordcom/commerce-db';

export type ShopSwitcherEntry = { name: string; domain: string };

/**
 * Returns the shops the given operator may switch between — exactly the shops they collaborate on,
 * resolved through the same `shopCollaborators` membership that the Convex `resolveActiveAdminShopId`
 * token mint re-verifies before pinning a tenant. An operator with no memberships gets no shops.
 *
 * @param userId - The authenticated operator's platform user id.
 * @returns Name and domain for each shop the operator collaborates on, for the shop switcher.
 */
export async function getShopsForUser(userId: string): Promise<ShopSwitcherEntry[]> {
    const shops = await Shop.findByCollaborator({ collaboratorId: userId });
    return shops.map((shop) => ({ name: shop.name, domain: shop.domain }));
}

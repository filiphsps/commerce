import type { Payload } from 'payload';
import { type ShopForSync, syncShopToTenant } from './post-save-hook';

export type ShopFinder = () => Promise<ShopForSync[]>;

/**
 * One-shot backfill: walk every Shop in the source-of-truth Mongoose
 * collection and ensure each has a matching `tenants` doc in Payload.
 *
 * The `attachShopSync` post-save hook only fires when a Shop is *saved* —
 * so any Shop that was created before the hook was wired up (older
 * deployments, manual inserts, restored backups) has no mirrored tenant,
 * and the multi-tenant plugin's `GlobalViewRedirect` then bails to `/cms`
 * when an editor tries to open a global like Business Data / Header /
 * Footer (because no tenant exists to scope the global to).
 *
 * Safe to call repeatedly: `syncShopToTenant` is itself idempotent.
 */
export const seedTenantsForExistingShops = async ({
    payload,
    findShops,
}: {
    payload: Payload;
    findShops: ShopFinder;
}): Promise<{ synced: number; failed: number }> => {
    let synced = 0;
    let failed = 0;
    let shops: ShopForSync[];
    try {
        shops = await findShops();
    } catch (err) {
        console.error('[cms] seedTenantsForExistingShops: shop lookup failed:', err);
        return { synced: 0, failed: 0 };
    }
    for (const shop of shops) {
        try {
            await syncShopToTenant(payload, shop);
            synced += 1;
        } catch (err) {
            failed += 1;
            console.error(`[cms] seedTenantsForExistingShops: sync failed for shop ${shop.id} (${shop.domain}):`, err);
        }
    }
    if (synced > 0 || failed > 0) {
        console.info(`[cms] seedTenantsForExistingShops: ${synced} synced, ${failed} failed`);
    }
    return { synced, failed };
};

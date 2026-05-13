import type { Payload } from 'payload';

export type ShopForSync = {
    id: string;
    name: string;
    domain: string;
    i18n: { defaultLocale: string; locales: string[] };
};

const slugify = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const syncShopToTenant = async (payload: Payload, shop: ShopForSync): Promise<void> => {
    const existing = await payload.find({
        collection: 'tenants',
        where: { shopId: { equals: shop.id } },
        limit: 1,
    });
    const data = {
        shopId: shop.id,
        name: shop.name,
        slug: slugify(shop.domain),
        defaultLocale: shop.i18n.defaultLocale,
        locales: shop.i18n.locales,
    };
    if (existing.docs[0]) {
        await payload.update({ collection: 'tenants', id: existing.docs[0].id, data });
        return;
    }
    await payload.create({ collection: 'tenants', data });
};

/** Attaches the sync to the Shop Mongoose model. Called once at admin app boot. */
export const attachShopSync = (
    shopModel: { post: (event: 'save', fn: (doc: ShopForSync) => Promise<void>) => void },
    payload: Payload,
): void => {
    shopModel.post('save', async (doc) => {
        try {
            await syncShopToTenant(payload, doc);
        } catch (err) {
            console.error('[cms] Shop -> tenant sync failed:', err);
        }
    });
};

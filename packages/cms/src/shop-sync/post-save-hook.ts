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

/**
 * Mongoose schema-hook interface — `post('save', fn)` lives on the schema, not
 * the Model class. Accept either shape (a raw schema, or a Model with `.schema`)
 * so callers can hand in `Shop.model` directly.
 */
export type ShopModelLike = {
    schema?: { post: (event: 'save', fn: (doc: ShopForSync) => Promise<void>) => unknown };
    post?: (event: 'save', fn: (doc: ShopForSync) => Promise<void>) => unknown;
};

/** Attaches the sync to the Shop Mongoose model. Called once at admin app boot. */
export const attachShopSync = (shopModel: ShopModelLike, payload: Payload): void => {
    const hook = async (doc: ShopForSync) => {
        try {
            await syncShopToTenant(payload, doc);
        } catch (err) {
            console.error('[cms] Shop -> tenant sync failed:', err);
        }
    };
    if (shopModel.schema && typeof shopModel.schema.post === 'function') {
        shopModel.schema.post('save', hook);
        return;
    }
    if (typeof shopModel.post === 'function') {
        shopModel.post('save', hook);
        return;
    }
    throw new TypeError(
        '[cms] attachShopSync: expected a Mongoose Model with `.schema.post` or a Schema with `.post`',
    );
};

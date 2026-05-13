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
    // Runs from a Mongoose post-save hook outside any HTTP request, so there is
    // no `req.user` for Payload access predicates to inspect. Without
    // `overrideAccess: true`, the tenants collection's `create: adminOnly`
    // predicate rejects the call and the sync silently leaves the Shop without
    // its mirrored tenant.
    const existing = await payload.find({
        collection: 'tenants',
        where: { shopId: { equals: shop.id } },
        limit: 1,
        overrideAccess: true,
    });
    const data = {
        shopId: shop.id,
        name: shop.name,
        slug: slugify(shop.domain),
        defaultLocale: shop.i18n.defaultLocale,
        locales: shop.i18n.locales,
    };
    if (existing.docs[0]) {
        await payload.update({
            collection: 'tenants',
            id: existing.docs[0].id,
            data,
            overrideAccess: true,
        });
        return;
    }
    await payload.create({ collection: 'tenants', data, overrideAccess: true });
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

// Track which Mongoose schemas already have the sync hook so repeated
// `attachShopSync` calls (Next.js hot reload, retried boot, multiple
// `getPayload` callers) don't stack duplicate listeners — each duplicate would
// fire the sync once more per Shop save, multiplying tenant upserts and noise.
const attachedSchemas = new WeakSet<object>();

/**
 * The Payload instance is resolved lazily by the caller so the hook can attach
 * synchronously at module load — earlier than the `configPromise.then(...)`
 * pattern, which left a race window where Shop saves during admin app startup
 * fired before the listener was registered and were silently dropped.
 */
export type PayloadResolver = Payload | (() => Promise<Payload>);

const resolvePayload = async (resolver: PayloadResolver): Promise<Payload> =>
    typeof resolver === 'function' ? await resolver() : resolver;

/** Attaches the sync to the Shop Mongoose model. Idempotent. */
export const attachShopSync = (shopModel: ShopModelLike, payload: PayloadResolver): void => {
    const hook = async (doc: ShopForSync) => {
        try {
            const resolved = await resolvePayload(payload);
            await syncShopToTenant(resolved, doc);
        } catch (err) {
            console.error('[cms] Shop -> tenant sync failed:', err);
        }
    };
    const schema = shopModel.schema;
    if (schema && typeof schema.post === 'function') {
        if (attachedSchemas.has(schema as unknown as object)) return;
        attachedSchemas.add(schema as unknown as object);
        schema.post('save', hook);
        return;
    }
    if (typeof shopModel.post === 'function') {
        if (attachedSchemas.has(shopModel as unknown as object)) return;
        attachedSchemas.add(shopModel as unknown as object);
        shopModel.post('save', hook);
        return;
    }
    throw new TypeError(
        '[cms] attachShopSync: expected a Mongoose Model with `.schema.post` or a Schema with `.post`',
    );
};

import type { Payload } from 'payload';
import { LEGACY_TENANTS_SLUG } from '../legacy-tenants-slug';

/**
 * Minimal shop shape the sync hook reads from a Mongoose `post('save', doc)`
 * callback. Carries only the fields that map to the `tenants` collection row.
 *
 * @example
 * syncShopToTenant(payload, { id: 'abc', name: 'My Shop', domain: 'shop.example.com', i18n: { defaultLocale: 'en-US' } });
 */
export type ShopForSync = {
    id: string;
    name: string;
    domain: string;
    /**
     * Source-of-truth Shop schema only persists `defaultLocale` — `locales`
     * is reconstructed by Storefront API. The tenants collection has a
     * `defaultValue: ['en-US']` on its `locales` field, so when callers
     * don't supply one we let Payload fall back instead of writing `[]`
     * (which fails the `required: true` + `hasMany` constraint).
     */
    i18n: { defaultLocale: string; locales?: string[] };
};

// `tenants.slug` carries a `unique: true` index. Two shops with collision-prone
// domains (`Example.com` vs `example.com.`, custom-vs-myshopify, casing
// differences) used to slug to the same value, the second save would throw on
// the index, and the post-save hook caught it silently — leaving the second
// shop without a mirrored tenant. shop.id is the only attribute guaranteed
// unique by the source-of-truth Mongoose schema, so use it directly.
/**
 * Upserts the Payload `tenants` row that mirrors `shop`. Uses `shop.id` as
 * the slug and lookup key because domain-based slugs collide across casing
 * variants and custom vs. Shopify domains.
 *
 * Runs without a Payload user context (`overrideAccess: true`) because it is
 * invoked from a Mongoose post-save hook outside any HTTP request.
 *
 * @param payload - Initialized Payload instance.
 * @param shop - Shop data read from the Mongoose save callback.
 * @returns Resolves when the tenant upsert is complete.
 */
export const syncShopToTenant = async (payload: Payload, shop: ShopForSync): Promise<void> => {
    // Runs from a Mongoose post-save hook outside any HTTP request, so there is
    // no `req.user` for Payload access predicates to inspect. Without
    // `overrideAccess: true`, the tenants collection's `create: adminOnly`
    // predicate rejects the call and the sync silently leaves the Shop without
    // its mirrored tenant.
    const existing = await payload.find({
        collection: LEGACY_TENANTS_SLUG,
        where: { shopId: { equals: shop.id } },
        limit: 1,
        overrideAccess: true,
    });
    const locales = shop.i18n.locales && shop.i18n.locales.length > 0 ? shop.i18n.locales : [shop.i18n.defaultLocale];
    // `as never`: the deleted `tenants` collection has no generated data type, so
    // this shape matches no `CollectionSlug` member. Cast preserves the upsert
    // payload until UNIFY-05/06 removes this hook (see legacy-tenants-slug.ts).
    const data = {
        shopId: shop.id,
        name: shop.name,
        slug: shop.id,
        defaultLocale: shop.i18n.defaultLocale,
        locales,
    } as never;
    if (existing.docs[0]) {
        await payload.update({
            collection: LEGACY_TENANTS_SLUG,
            id: existing.docs[0].id,
            data,
            overrideAccess: true,
        });
        return;
    }
    await payload.create({ collection: LEGACY_TENANTS_SLUG, data, overrideAccess: true });
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

/**
 * Resolves a {@link PayloadResolver} to a `Payload` instance by awaiting the
 * factory when it is a function, or returning it directly otherwise.
 *
 * @param resolver - A Payload instance or an async factory returning one.
 * @returns The resolved Payload instance.
 */
const resolvePayload = async (resolver: PayloadResolver): Promise<Payload> =>
    typeof resolver === 'function' ? await resolver() : resolver;

/**
 * Attaches a `post('save', ...)` listener to the Shop Mongoose model that
 * mirrors every saved shop to the Payload `tenants` collection. Idempotent —
 * repeated calls with the same schema object are a no-op via a `WeakSet`
 * guard, preventing duplicate sync fires on Next.js hot reload.
 *
 * @param shopModel - A Mongoose Model or Schema-like object that exposes a `post` method.
 * @param payload - Payload instance or async factory; resolved lazily on first sync.
 * @throws {TypeError} When `shopModel` has neither `.schema.post` nor `.post`.
 */
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
    throw new TypeError('[cms] attachShopSync: expected a Mongoose Model with `.schema.post` or a Schema with `.post`');
};

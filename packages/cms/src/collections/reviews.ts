import type { CollectionConfig } from 'payload';
import { convexCutoverLocked, tenantScopedRead } from '../access';

/**
 * Payload collection config for `reviews`. Tenant-scoped product reviews tied
 * to a shop reference. The `tenant` field is injected by the multi-tenant
 * plugin; the `shop` relation provides an additional query index.
 *
 * CUTOVER-06: review data lives on the core Convex `reviews` table behind the
 * `db/reviews` seam (`Review.findByShop`/`findAll`), not in `cmsDocuments`;
 * this Payload collection only ever mirrored a shop reference. Every Payload
 * write operation is `convexCutoverLocked`; reads stay tenant-scoped until
 * TEARDOWN-02 removes the collection.
 */
export const reviews: CollectionConfig = {
    slug: 'reviews',
    admin: { useAsTitle: 'id', defaultColumns: ['shop', 'updatedAt'], hidden: true },
    access: {
        read: tenantScopedRead,
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
    },
    fields: [
        { name: 'shop', type: 'relationship', relationTo: 'shops', required: true, index: true },
        // `tenant` is injected automatically by @payloadcms/plugin-multi-tenant
        // because this collection is listed in `tenantScopedCollections`.
    ],
};

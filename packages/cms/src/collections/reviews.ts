import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';

/**
 * Payload collection config for `reviews`. Tenant-scoped product reviews tied
 * to a shop reference. The `tenant` field is injected by the multi-tenant
 * plugin; the `shop` relation provides an additional query index.
 */
export const reviews: CollectionConfig = {
    slug: 'reviews',
    admin: { useAsTitle: 'id', defaultColumns: ['shop', 'updatedAt'] },
    access: {
        read: tenantScopedRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
    },
    fields: [
        { name: 'shop', type: 'relationship', relationTo: 'shops', required: true, index: true },
        // `tenant` is injected automatically by @payloadcms/plugin-multi-tenant
        // because this collection is listed in `tenantScopedCollections`.
    ],
};

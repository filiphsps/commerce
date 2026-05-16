import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';

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
        { name: 'shop', type: 'relationship', relationTo: 'shops' as never, required: true, index: true },
        // `tenant` is injected automatically by @payloadcms/plugin-multi-tenant
        // because this collection is listed in `tenantScopedCollections`.
    ],
};

import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

/** Editor manifest for the `reviews` collection. Tenant-scoped; editors can read and create but not delete. */
export const reviewsEditor = defineCollectionEditor({
    collection: 'reviews',
    routes: {
        label: { singular: 'Review', plural: 'Reviews' },
        basePath: (domain) => `/${domain}/reviews/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Reviews', href: `/${domain}/reviews/` as Route }],
    },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: {
        list: tenantMember,
        read: tenantMember,
        create: editorOrAdmin,
        update: editorOrAdmin,
        delete: adminOnly,
    },
    list: {
        columns: [
            { label: 'ID', accessor: 'id' },
            { label: 'Updated', accessor: 'updatedAt' },
        ],
        bulkActions: ['delete'],
    },
    revalidate: ({ domain }) => [`/${domain}/reviews/`],
});

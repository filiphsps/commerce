import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

export const reviewEditor = defineCollectionEditor({
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

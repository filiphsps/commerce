import type { Route } from 'next';
import { adminOnly } from '../access';
import { defineCollectionEditor } from '../manifest';

/** Editor manifest for the `tenants` collection. Admin-only; cross-tenant (shared) read access. */
export const tenantsEditor = defineCollectionEditor({
    collection: 'tenants',
    routes: {
        label: { singular: 'Tenant', plural: 'Tenants' },
        basePath: (domain) => `/${domain}/settings/tenants/` as Route,
        breadcrumbs: ({ domain }) => [
            { label: 'Settings', href: `/${domain}/settings/` as Route },
            { label: 'Tenants' },
        ],
    },
    tenant: { kind: 'shared', readableBy: 'admin' },
    access: {
        list: adminOnly,
        read: adminOnly,
        create: adminOnly,
        update: adminOnly,
        delete: adminOnly,
    },
    list: {
        columns: [
            { label: 'Name', accessor: 'name' },
            { label: 'Slug', accessor: 'slug' },
            { label: 'Updated', accessor: 'updatedAt' },
        ],
    },
});

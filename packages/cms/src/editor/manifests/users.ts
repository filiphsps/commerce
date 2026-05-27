import type { Route } from 'next';
import { adminOnly } from '../access';
import { defineCollectionEditor } from '../manifest';

/** Editor manifest for the `users` collection. Admin-only; cross-tenant (shared) read access. */
export const usersEditor = defineCollectionEditor({
    collection: 'users',
    routes: {
        label: { singular: 'User', plural: 'Users' },
        basePath: (domain) => `/${domain}/settings/users/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Settings', href: `/${domain}/settings/` as Route }, { label: 'Users' }],
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
            { label: 'Email', accessor: 'email' },
            { label: 'Role', accessor: 'role' },
            { label: 'Updated', accessor: 'updatedAt' },
        ],
    },
});

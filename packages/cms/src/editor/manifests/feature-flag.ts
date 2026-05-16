import type { Route } from 'next';
import { adminOnly } from '../access';
import { defineCollectionEditor } from '../manifest';

export const featureFlagEditor = defineCollectionEditor({
    collection: 'feature-flags',
    routes: {
        label: { singular: 'Feature flag', plural: 'Feature flags' },
        basePath: () => `/admin/feature-flags/` as Route,
        keyField: 'key',
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
            { label: 'Key', accessor: 'key' },
            { label: 'Description', accessor: 'description' },
        ],
    },
});

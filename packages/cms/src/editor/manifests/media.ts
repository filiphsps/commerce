import type { Route } from 'next';
import { adminOnly } from '../access';
import { defineCollectionEditor } from '../manifest';

export const mediaEditor = defineCollectionEditor({
    collection: 'media',
    routes: {
        label: { singular: 'Media', plural: 'Media' },
        basePath: (domain) => `/${domain}/settings/media/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Settings', href: `/${domain}/settings/` as Route }, { label: 'Media' }],
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
            { label: 'Filename', accessor: 'filename' },
            { label: 'Mime type', accessor: 'mimeType' },
            { label: 'Updated', accessor: 'updatedAt' },
        ],
    },
});

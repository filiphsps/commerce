import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

/** Editor manifest for the `pages` collection. Tenant-scoped; supports drafts and live preview. */
export const pagesEditor = defineCollectionEditor({
    collection: 'pages',
    routes: {
        label: { singular: 'Page', plural: 'Pages' },
        basePath: (domain) => `/${domain}/content/pages/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Content', href: `/${domain}/content/` as Route }, { label: 'Pages' }],
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
            { label: 'Title', accessor: 'title' },
            { label: 'Slug', accessor: 'slug' },
            { label: 'Updated', accessor: 'updatedAt' },
        ],
        bulkActions: ['delete', 'publish'],
        emptyState: {
            label: 'No pages yet',
            description: 'Create your first page to start populating this shop.',
            actionLabel: 'New page',
        },
    },
    revalidate: ({ domain }) => [`/${domain}/content/pages/`, `/${domain}/`],
});

import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

/** Editor manifest for the `articles` collection. Tenant-scoped; supports drafts and live preview. */
export const articlesEditor = defineCollectionEditor({
    collection: 'articles',
    routes: {
        label: { singular: 'Article', plural: 'Articles' },
        basePath: (domain) => `/${domain}/content/articles/` as Route,
        breadcrumbs: ({ domain }) => [
            { label: 'Content', href: `/${domain}/content/` as Route },
            { label: 'Articles' },
        ],
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
            { label: 'Published', accessor: 'publishedAt' },
            { label: 'Updated', accessor: 'updatedAt' },
        ],
        bulkActions: ['delete', 'publish'],
        emptyState: {
            label: 'No articles yet',
            description: 'Publish your first article to get the blog started.',
            actionLabel: 'New article',
        },
    },
    revalidate: ({ domain }) => [`/${domain}/content/articles/`, `/${domain}/`],
});

import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

/** Editor manifest for the `search` global. Tenant-singleton; one search landing per tenant with draft support. */
export const searchEditor = defineCollectionEditor({
    collection: 'search',
    routes: {
        label: { singular: 'Search', plural: 'Search' },
        description: 'Search landing copy, empty-state, and promoted results.',
        basePath: (domain) => `/${domain}/content/search/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Content', href: `/${domain}/content/` as Route }, { label: 'Search' }],
    },
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
    access: {
        list: tenantMember,
        read: tenantMember,
        update: editorOrAdmin,
        delete: adminOnly,
    },
    revalidate: ({ domain }) => [`/${domain}/content/search/`],
});
